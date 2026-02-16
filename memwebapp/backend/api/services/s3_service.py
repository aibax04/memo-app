import boto3
import os
import logging
import tempfile
from typing import Optional, BinaryIO
from botocore.exceptions import ClientError, NoCredentialsError
from pydub import AudioSegment
from config.settings import settings

# Configure logging with timestamps (if not already configured)
if not logging.getLogger().handlers:
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
logger = logging.getLogger(__name__)

class S3Service:
    def __init__(self):
        """Initialize S3 service with AWS credentials"""
        try:
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_REGION
            )
            self.bucket_name = settings.S3_BUCKET_NAME
            self.audio_prefix = settings.S3_AUDIO_PREFIX
            logger.info(f"✅ S3 service initialized - Bucket: {self.bucket_name}, Region: {settings.AWS_REGION}")
        except NoCredentialsError:
            logger.error("❌ AWS credentials not found")
            raise Exception("AWS credentials not configured")
        except Exception as e:
            logger.error(f"❌ Failed to initialize S3 service: {e}")
            raise Exception(f"Failed to initialize S3 service: {e}")

    def upload_audio_file(self, file_path: str, meeting_uuid: str, filename: str) -> Optional[str]:
        """
        Upload audio file to S3 and return the S3 key/path
        All audio files are converted to MP3 before upload.
        
        Args:
            file_path: Local path to the audio file
            meeting_uuid: UUID of the meeting
            filename: Original filename
            
        Returns:
            S3 key/path if successful, None if failed
        """
        temp_mp3_path = None
        try:
            # Convert audio file to MP3
            temp_mp3_path = self._convert_to_mp3(file_path)
            
            # Generate S3 key with MP3 extension
            s3_key = f"{self.audio_prefix}{meeting_uuid}/{meeting_uuid}.mp3"
            
            logger.info(f"📤 Uploading MP3 audio file to S3: {s3_key}")
            
            # Upload MP3 file to S3
            with open(temp_mp3_path, 'rb') as file_data:
                self.s3_client.upload_fileobj(
                    file_data,
                    self.bucket_name,
                    s3_key,
                    ExtraArgs={
                        'ContentType': 'audio/mpeg',
                        'Metadata': {
                            'meeting_uuid': meeting_uuid,
                            'original_filename': filename,
                            'converted_to_mp3': 'true'
                        }
                    }
                )
            
            logger.info(f"✅ MP3 audio file uploaded successfully to S3: {s3_key}")
            return s3_key
            
        except FileNotFoundError:
            logger.error(f"❌ Local file not found: {file_path}")
            return None
        except ClientError as e:
            logger.error(f"❌ S3 upload failed: {e}")
            return None
        except Exception as e:
            logger.error(f"❌ Unexpected error during S3 upload: {e}")
            return None
        finally:
            # Clean up temporary MP3 file
            if temp_mp3_path and os.path.exists(temp_mp3_path):
                try:
                    os.remove(temp_mp3_path)
                    logger.debug(f"🧹 Cleaned up temporary MP3 file: {temp_mp3_path}")
                except Exception as e:
                    logger.warning(f"⚠️ Failed to clean up temporary MP3 file {temp_mp3_path}: {e}")

    def download_audio_file(self, s3_key: str) -> Optional[bytes]:
        """
        Download audio file from S3
        
        Args:
            s3_key: S3 key/path of the file
            
        Returns:
            File content as bytes if successful, None if failed
        """
        try:
            logger.info(f"📥 Downloading audio file from S3: {s3_key}")
            
            response = self.s3_client.get_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            
            file_content = response['Body'].read()
            logger.info(f"✅ Audio file downloaded successfully from S3: {s3_key}")
            return file_content
            
        except ClientError as e:
            if e.response['Error']['Code'] == 'NoSuchKey':
                logger.error(f"❌ File not found in S3: {s3_key}")
            else:
                logger.error(f"❌ S3 download failed: {e}")
            return None
        except Exception as e:
            logger.error(f"❌ Unexpected error during S3 download: {e}")
            return None

    def delete_audio_file(self, s3_key: str) -> bool:
        """
        Delete audio file from S3
        
        Args:
            s3_key: S3 key/path of the file
            
        Returns:
            True if successful, False if failed
        """
        try:
            logger.info(f"🗑️ Deleting audio file from S3: {s3_key}")
            
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            
            logger.info(f"✅ Audio file deleted successfully from S3: {s3_key}")
            return True
            
        except ClientError as e:
            logger.error(f"❌ S3 delete failed: {e}")
            return False
        except Exception as e:
            logger.error(f"❌ Unexpected error during S3 delete: {e}")
            return False

    def get_audio_file_url(self, s3_key: str, expiration: int = 3600) -> Optional[str]:
        """
        Generate a presigned URL for audio file access
        
        Args:
            s3_key: S3 key/path of the file
            expiration: URL expiration time in seconds (default: 1 hour)
            
        Returns:
            Presigned URL if successful, None if failed
        """
        try:
            logger.info(f"🔗 Generating presigned URL for S3 file: {s3_key}")
            
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': s3_key},
                ExpiresIn=expiration
            )
            
            logger.info(f"✅ Presigned URL generated successfully for: {s3_key}")
            return url
            
        except ClientError as e:
            logger.error(f"❌ Failed to generate presigned URL: {e}")
            return None
        except Exception as e:
            logger.error(f"❌ Unexpected error generating presigned URL: {e}")
            return None

    def _convert_to_mp3(self, input_file_path: str) -> str:
        """
        Convert audio file to MP3 format
        
        Args:
            input_file_path: Path to the input audio file
            
        Returns:
            Path to the converted MP3 file
        """
        try:
            logger.info(f"🔄 Converting audio file to MP3: {input_file_path}")
            
            # Create temporary file for MP3 output
            temp_fd, temp_mp3_path = tempfile.mkstemp(suffix='.mp3')
            os.close(temp_fd)  # Close the file descriptor, we only need the path
            
            # Load the audio file
            audio = AudioSegment.from_file(input_file_path)
            
            # Export as MP3 with good quality settings
            audio.export(
                temp_mp3_path,
                format="mp3",
                bitrate="192k",  # Good quality bitrate
                parameters=["-q:a", "2"]  # High quality encoding
            )
            
            logger.info(f"✅ Audio file converted to MP3: {temp_mp3_path}")
            return temp_mp3_path
            
        except Exception as e:
            logger.error(f"❌ Error converting audio to MP3: {e}")
            raise Exception(f"Failed to convert audio file to MP3: {str(e)}")

    def _get_content_type(self, file_extension: str) -> str:
        """Get appropriate content type based on file extension"""
        # Always return MP3 content type since we convert everything to MP3
        return 'audio/mpeg'

    def check_bucket_exists(self) -> bool:
        """Check if the configured S3 bucket exists"""
        try:
            self.s3_client.head_bucket(Bucket=self.bucket_name)
            logger.info(f"✅ S3 bucket exists: {self.bucket_name}")
            return True
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == '404':
                logger.error(f"❌ S3 bucket not found: {self.bucket_name}")
            else:
                logger.error(f"❌ Error checking S3 bucket: {e}")
            return False
        except Exception as e:
            logger.error(f"❌ Unexpected error checking S3 bucket: {e}")
            return False

# Global S3 service instance
s3_service = S3Service()
