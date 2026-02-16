export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      agent_call_metrics: {
        Row: {
          agent_id: string
          benchmark_score: number | null
          call_id: string
          call_timestamp: string | null
          callback_reason: string | null
          created_at: string | null
          id: string
          qa_score: number | null
          requires_callback: boolean | null
          talk_time_seconds: number | null
        }
        Insert: {
          agent_id: string
          benchmark_score?: number | null
          call_id: string
          call_timestamp?: string | null
          callback_reason?: string | null
          created_at?: string | null
          id?: string
          qa_score?: number | null
          requires_callback?: boolean | null
          talk_time_seconds?: number | null
        }
        Update: {
          agent_id?: string
          benchmark_score?: number | null
          call_id?: string
          call_timestamp?: string | null
          callback_reason?: string | null
          created_at?: string | null
          id?: string
          qa_score?: number | null
          requires_callback?: boolean | null
          talk_time_seconds?: number | null
        }
        Relationships: []
      }
      analysis_queries: {
        Row: {
          created_at: string
          id: string
          processing_time_ms: number | null
          query: string
          result: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          processing_time_ms?: number | null
          query: string
          result?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          processing_time_ms?: number | null
          query?: string
          result?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      chart_usage_limits: {
        Row: {
          chart_count: number | null
          created_at: string | null
          date: string
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          chart_count?: number | null
          created_at?: string | null
          date?: string
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          chart_count?: number | null
          created_at?: string | null
          date?: string
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      conversation_messages: {
        Row: {
          conversation_id: string
          id: string
          sender: string
          text: string
          timestamp: string
        }
        Insert: {
          conversation_id: string
          id?: string
          sender: string
          text: string
          timestamp?: string
        }
        Update: {
          conversation_id?: string
          id?: string
          sender?: string
          text?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_tags: {
        Row: {
          conversation_id: string
          id: string
          tag: string
        }
        Insert: {
          conversation_id: string
          id?: string
          tag: string
        }
        Update: {
          conversation_id?: string
          id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_tags_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          agent_id: string | null
          category: string
          customer_id: string
          customer_name: string | null
          duration: number
          id: string
          resolved: boolean
          satisfaction_score: number
          sentiment: string
          timestamp: string
        }
        Insert: {
          agent_id?: string | null
          category: string
          customer_id: string
          customer_name?: string | null
          duration: number
          id?: string
          resolved?: boolean
          satisfaction_score: number
          sentiment: string
          timestamp?: string
        }
        Update: {
          agent_id?: string | null
          category?: string
          customer_id?: string
          customer_name?: string | null
          duration?: number
          id?: string
          resolved?: boolean
          satisfaction_score?: number
          sentiment?: string
          timestamp?: string
        }
        Relationships: []
      }
      data_dictionary: {
        Row: {
          "Agent ID": string
          "Agent Name": string | null
          AON_Months: number | null
          BoxType: string | null
          Brand: string | null
          "Call End Time": string
          "Call Start Time": string
          call_id: string | null
          Center: string | null
          "Center/Location": string | null
          Current_Status: string | null
          "Customer Category ( Active/Multi/DA/Infant etc.)": string | null
          customer_category: string | null
          Customer_Language_Preference: string | null
          Customer_Segment: string | null
          Customer_Segment2: number | null
          CustomerType: string | null
          Duration: number | null
          file_name: number
          Id: string
          language: string | null
          Language: string | null
          last_recharge_date: string | null
          Last_recharge_date: string | null
          Location: string | null
          renewal_date: string | null
          Renewal_Due: string | null
          Satelite: string | null
          "Sequence Number": string | null
          smsid: number | null
          "Source of Call": string | null
          transcript: string | null
          vcno: string | null
          Warranty: string | null
          Watcho_Identification: string | null
        }
        Insert: {
          "Agent ID": string
          "Agent Name"?: string | null
          AON_Months?: number | null
          BoxType?: string | null
          Brand?: string | null
          "Call End Time": string
          "Call Start Time": string
          call_id?: string | null
          Center?: string | null
          "Center/Location"?: string | null
          Current_Status?: string | null
          "Customer Category ( Active/Multi/DA/Infant etc.)"?: string | null
          customer_category?: string | null
          Customer_Language_Preference?: string | null
          Customer_Segment?: string | null
          Customer_Segment2?: number | null
          CustomerType?: string | null
          Duration?: number | null
          file_name: number
          Id?: string
          language?: string | null
          Language?: string | null
          last_recharge_date?: string | null
          Last_recharge_date?: string | null
          Location?: string | null
          renewal_date?: string | null
          Renewal_Due?: string | null
          Satelite?: string | null
          "Sequence Number"?: string | null
          smsid?: number | null
          "Source of Call"?: string | null
          transcript?: string | null
          vcno?: string | null
          Warranty?: string | null
          Watcho_Identification?: string | null
        }
        Update: {
          "Agent ID"?: string
          "Agent Name"?: string | null
          AON_Months?: number | null
          BoxType?: string | null
          Brand?: string | null
          "Call End Time"?: string
          "Call Start Time"?: string
          call_id?: string | null
          Center?: string | null
          "Center/Location"?: string | null
          Current_Status?: string | null
          "Customer Category ( Active/Multi/DA/Infant etc.)"?: string | null
          customer_category?: string | null
          Customer_Language_Preference?: string | null
          Customer_Segment?: string | null
          Customer_Segment2?: number | null
          CustomerType?: string | null
          Duration?: number | null
          file_name?: number
          Id?: string
          language?: string | null
          Language?: string | null
          last_recharge_date?: string | null
          Last_recharge_date?: string | null
          Location?: string | null
          renewal_date?: string | null
          Renewal_Due?: string | null
          Satelite?: string | null
          "Sequence Number"?: string | null
          smsid?: number | null
          "Source of Call"?: string | null
          transcript?: string | null
          vcno?: string | null
          Warranty?: string | null
          Watcho_Identification?: string | null
        }
        Relationships: []
      }
      debug_logs: {
        Row: {
          component: string
          created_at: string | null
          data: Json | null
          generated_sql: string | null
          id: string
          message: string
          nlp_query: string | null
        }
        Insert: {
          component: string
          created_at?: string | null
          data?: Json | null
          generated_sql?: string | null
          id?: string
          message: string
          nlp_query?: string | null
        }
        Update: {
          component?: string
          created_at?: string | null
          data?: Json | null
          generated_sql?: string | null
          id?: string
          message?: string
          nlp_query?: string | null
        }
        Relationships: []
      }
      dish_sandbox_data: {
        Row: {
          "Agent ID": string | null
          "Agent Name": string | null
          AON_Months: string | null
          BoxType: string | null
          Brand: string | null
          "Call End Time": string | null
          "Call Start Time": string | null
          Center: string | null
          "Center/Location": string | null
          Current_Status: string | null
          "Customer Category ( Active/Multi/DA/Infant etc.)": string | null
          Customer_Language_Preference: string | null
          Customer_Segment: string | null
          Customer_Segment2: string | null
          CustomerType: string | null
          Duration: number | null
          file_name: number | null
          Language: string | null
          Last_recharge_date: string | null
          Location: string | null
          Renewal_Due: string | null
          Satelite: string | null
          "Sequence Number": string | null
          smsid: string | null
          "Source of Call": string | null
          transcript: string | null
          vcno: string | null
          Warranty: string | null
          Watcho_Identification: string | null
        }
        Insert: {
          "Agent ID"?: string | null
          "Agent Name"?: string | null
          AON_Months?: string | null
          BoxType?: string | null
          Brand?: string | null
          "Call End Time"?: string | null
          "Call Start Time"?: string | null
          Center?: string | null
          "Center/Location"?: string | null
          Current_Status?: string | null
          "Customer Category ( Active/Multi/DA/Infant etc.)"?: string | null
          Customer_Language_Preference?: string | null
          Customer_Segment?: string | null
          Customer_Segment2?: string | null
          CustomerType?: string | null
          Duration?: number | null
          file_name?: number | null
          Language?: string | null
          Last_recharge_date?: string | null
          Location?: string | null
          Renewal_Due?: string | null
          Satelite?: string | null
          "Sequence Number"?: string | null
          smsid?: string | null
          "Source of Call"?: string | null
          transcript?: string | null
          vcno?: string | null
          Warranty?: string | null
          Watcho_Identification?: string | null
        }
        Update: {
          "Agent ID"?: string | null
          "Agent Name"?: string | null
          AON_Months?: string | null
          BoxType?: string | null
          Brand?: string | null
          "Call End Time"?: string | null
          "Call Start Time"?: string | null
          Center?: string | null
          "Center/Location"?: string | null
          Current_Status?: string | null
          "Customer Category ( Active/Multi/DA/Infant etc.)"?: string | null
          Customer_Language_Preference?: string | null
          Customer_Segment?: string | null
          Customer_Segment2?: string | null
          CustomerType?: string | null
          Duration?: number | null
          file_name?: number | null
          Language?: string | null
          Last_recharge_date?: string | null
          Location?: string | null
          Renewal_Due?: string | null
          Satelite?: string | null
          "Sequence Number"?: string | null
          smsid?: string | null
          "Source of Call"?: string | null
          transcript?: string | null
          vcno?: string | null
          Warranty?: string | null
          Watcho_Identification?: string | null
        }
        Relationships: []
      }
      dish_sandbox_data_duplicate: {
        Row: {
          actual_reason: string | null
          "Agent ID": string | null
          "Agent Name": string | null
          AON_Months: string | null
          BoxType: string | null
          Brand: string | null
          "Call End Time": string | null
          "Call Start Time": string | null
          call_status: string | null
          call_type: string | null
          Center: string | null
          "Center/Location": string | null
          Current_Status: string | null
          "Customer Category ( Active/Multi/DA/Infant etc.)": string | null
          Customer_Language_Preference: string | null
          Customer_Segment: string | null
          Customer_Segment2: string | null
          CustomerType: string | null
          Duration: number | null
          file_name: number | null
          Language: string | null
          Last_recharge_date: string | null
          Location: string | null
          past_reference: string | null
          Renewal_Due: string | null
          Satelite: string | null
          sentiment: string | null
          "Sequence Number": string | null
          smsid: string | null
          "Source of Call": string | null
          transcript: string | null
          vcno: string | null
          Warranty: string | null
          Watcho_Identification: string | null
        }
        Insert: {
          actual_reason?: string | null
          "Agent ID"?: string | null
          "Agent Name"?: string | null
          AON_Months?: string | null
          BoxType?: string | null
          Brand?: string | null
          "Call End Time"?: string | null
          "Call Start Time"?: string | null
          call_status?: string | null
          call_type?: string | null
          Center?: string | null
          "Center/Location"?: string | null
          Current_Status?: string | null
          "Customer Category ( Active/Multi/DA/Infant etc.)"?: string | null
          Customer_Language_Preference?: string | null
          Customer_Segment?: string | null
          Customer_Segment2?: string | null
          CustomerType?: string | null
          Duration?: number | null
          file_name?: number | null
          Language?: string | null
          Last_recharge_date?: string | null
          Location?: string | null
          past_reference?: string | null
          Renewal_Due?: string | null
          Satelite?: string | null
          sentiment?: string | null
          "Sequence Number"?: string | null
          smsid?: string | null
          "Source of Call"?: string | null
          transcript?: string | null
          vcno?: string | null
          Warranty?: string | null
          Watcho_Identification?: string | null
        }
        Update: {
          actual_reason?: string | null
          "Agent ID"?: string | null
          "Agent Name"?: string | null
          AON_Months?: string | null
          BoxType?: string | null
          Brand?: string | null
          "Call End Time"?: string | null
          "Call Start Time"?: string | null
          call_status?: string | null
          call_type?: string | null
          Center?: string | null
          "Center/Location"?: string | null
          Current_Status?: string | null
          "Customer Category ( Active/Multi/DA/Infant etc.)"?: string | null
          Customer_Language_Preference?: string | null
          Customer_Segment?: string | null
          Customer_Segment2?: string | null
          CustomerType?: string | null
          Duration?: number | null
          file_name?: number | null
          Language?: string | null
          Last_recharge_date?: string | null
          Location?: string | null
          past_reference?: string | null
          Renewal_Due?: string | null
          Satelite?: string | null
          sentiment?: string | null
          "Sequence Number"?: string | null
          smsid?: string | null
          "Source of Call"?: string | null
          transcript?: string | null
          vcno?: string | null
          Warranty?: string | null
          Watcho_Identification?: string | null
        }
        Relationships: []
      }
      dish_v1: {
        Row: {
          actual_reason: string | null
          "Agent ID": string | null
          "Agent Name": string | null
          AON_Months: string | null
          BoxType: string | null
          Brand: string | null
          "Call End Time": string | null
          "Call Start Time": string | null
          call_status: string | null
          call_type: string | null
          Center: string | null
          "Center/Location": string | null
          Current_Status: string | null
          "Customer Category ( Active/Multi/DA/Infant etc.)": string | null
          Customer_Language_Preference: string | null
          Customer_Segment: string | null
          Customer_Segment2: string | null
          CustomerType: string | null
          Duration: number | null
          file_name: number | null
          Language: string | null
          Last_recharge_date: string | null
          Location: string | null
          past_reference: string | null
          Renewal_Due: string | null
          Satelite: string | null
          sentiment: string | null
          "Sequence Number": string | null
          smsid: string | null
          "Source of Call": string | null
          transcript: string | null
          vcno: string | null
          Warranty: string | null
          Watcho_Identification: string | null
        }
        Insert: {
          actual_reason?: string | null
          "Agent ID"?: string | null
          "Agent Name"?: string | null
          AON_Months?: string | null
          BoxType?: string | null
          Brand?: string | null
          "Call End Time"?: string | null
          "Call Start Time"?: string | null
          call_status?: string | null
          call_type?: string | null
          Center?: string | null
          "Center/Location"?: string | null
          Current_Status?: string | null
          "Customer Category ( Active/Multi/DA/Infant etc.)"?: string | null
          Customer_Language_Preference?: string | null
          Customer_Segment?: string | null
          Customer_Segment2?: string | null
          CustomerType?: string | null
          Duration?: number | null
          file_name?: number | null
          Language?: string | null
          Last_recharge_date?: string | null
          Location?: string | null
          past_reference?: string | null
          Renewal_Due?: string | null
          Satelite?: string | null
          sentiment?: string | null
          "Sequence Number"?: string | null
          smsid?: string | null
          "Source of Call"?: string | null
          transcript?: string | null
          vcno?: string | null
          Warranty?: string | null
          Watcho_Identification?: string | null
        }
        Update: {
          actual_reason?: string | null
          "Agent ID"?: string | null
          "Agent Name"?: string | null
          AON_Months?: string | null
          BoxType?: string | null
          Brand?: string | null
          "Call End Time"?: string | null
          "Call Start Time"?: string | null
          call_status?: string | null
          call_type?: string | null
          Center?: string | null
          "Center/Location"?: string | null
          Current_Status?: string | null
          "Customer Category ( Active/Multi/DA/Infant etc.)"?: string | null
          Customer_Language_Preference?: string | null
          Customer_Segment?: string | null
          Customer_Segment2?: string | null
          CustomerType?: string | null
          Duration?: number | null
          file_name?: number | null
          Language?: string | null
          Last_recharge_date?: string | null
          Location?: string | null
          past_reference?: string | null
          Renewal_Due?: string | null
          Satelite?: string | null
          sentiment?: string | null
          "Sequence Number"?: string | null
          smsid?: string | null
          "Source of Call"?: string | null
          transcript?: string | null
          vcno?: string | null
          Warranty?: string | null
          Watcho_Identification?: string | null
        }
        Relationships: []
      }
      gemini_llm_logs: {
        Row: {
          error: string | null
          feature: string
          id: string
          processing_time_ms: number | null
          request_data: Json | null
          response_data: Json | null
          timestamp: string | null
        }
        Insert: {
          error?: string | null
          feature: string
          id?: string
          processing_time_ms?: number | null
          request_data?: Json | null
          response_data?: Json | null
          timestamp?: string | null
        }
        Update: {
          error?: string | null
          feature?: string
          id?: string
          processing_time_ms?: number | null
          request_data?: Json | null
          response_data?: Json | null
          timestamp?: string | null
        }
        Relationships: []
      }
      gemini_word_cloud_logs: {
        Row: {
          error: string | null
          id: string
          processing_time_ms: number | null
          request_data: Json | null
          response_data: Json | null
          timestamp: string
        }
        Insert: {
          error?: string | null
          id?: string
          processing_time_ms?: number | null
          request_data?: Json | null
          response_data?: Json | null
          timestamp?: string
        }
        Update: {
          error?: string | null
          id?: string
          processing_time_ms?: number | null
          request_data?: Json | null
          response_data?: Json | null
          timestamp?: string
        }
        Relationships: []
      }
      parchaa_data: {
        Row: {
          Age: number | null
          Allergies: string | null
          Date: string | null
          Department: string | null
          Diagnosis: string | null
          Doctor: string | null
          "Follow-Up Date": string | null
          Gender: string | null
          Medications: string | null
          Mode: string | null
          Name: string | null
          Notes: string | null
          "Patient ID": string | null
          Symptoms: string | null
          "Vitals (BP/HR/T)": string | null
        }
        Insert: {
          Age?: number | null
          Allergies?: string | null
          Date?: string | null
          Department?: string | null
          Diagnosis?: string | null
          Doctor?: string | null
          "Follow-Up Date"?: string | null
          Gender?: string | null
          Medications?: string | null
          Mode?: string | null
          Name?: string | null
          Notes?: string | null
          "Patient ID"?: string | null
          Symptoms?: string | null
          "Vitals (BP/HR/T)"?: string | null
        }
        Update: {
          Age?: number | null
          Allergies?: string | null
          Date?: string | null
          Department?: string | null
          Diagnosis?: string | null
          Doctor?: string | null
          "Follow-Up Date"?: string | null
          Gender?: string | null
          Medications?: string | null
          Mode?: string | null
          Name?: string | null
          Notes?: string | null
          "Patient ID"?: string | null
          Symptoms?: string | null
          "Vitals (BP/HR/T)"?: string | null
        }
        Relationships: []
      }
      user_bookmarks: {
        Row: {
          chart_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          chart_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          chart_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_bookmarks_chart_id_fkey"
            columns: ["chart_id"]
            isOneToOne: false
            referencedRelation: "user_charts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_charts: {
        Row: {
          analysis_explanation: string | null
          created_at: string
          dashboard_id: string
          data: Json | null
          gemini_direct_response: string | null
          id: string
          name: string
          prompt: string
          requires_advanced_analysis: boolean | null
          type: string
          updated_at: string
        }
        Insert: {
          analysis_explanation?: string | null
          created_at?: string
          dashboard_id: string
          data?: Json | null
          gemini_direct_response?: string | null
          id?: string
          name: string
          prompt: string
          requires_advanced_analysis?: boolean | null
          type: string
          updated_at?: string
        }
        Update: {
          analysis_explanation?: string | null
          created_at?: string
          dashboard_id?: string
          data?: Json | null
          gemini_direct_response?: string | null
          id?: string
          name?: string
          prompt?: string
          requires_advanced_analysis?: boolean | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_charts_dashboard_id_fkey"
            columns: ["dashboard_id"]
            isOneToOne: false
            referencedRelation: "user_dashboards"
            referencedColumns: ["id"]
          },
        ]
      }
      user_dashboards: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      voice_data: {
        Row: {
          created_at: string
          filename: string
          id: string
          processed: boolean | null
          segments: Json | null
          transcription: string | null
        }
        Insert: {
          created_at?: string
          filename: string
          id?: string
          processed?: boolean | null
          segments?: Json | null
          transcription?: string | null
        }
        Update: {
          created_at?: string
          filename?: string
          id?: string
          processed?: boolean | null
          segments?: Json | null
          transcription?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      execute_sql: {
        Args: { sql_query: string }
        Returns: Json
      }
      increment_user_chart_count: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      insert_mock_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
