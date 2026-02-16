
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Download, Loader2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

interface QueryAnalyzerProps {
  isOpen: boolean;
  onClose: () => void;
}

const QueryAnalyzer: React.FC<QueryAnalyzerProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const { toast: uiToast } = useToast();
  const { user } = useAuth();
  
  const analyzeQuery = async () => {
    if (!query.trim()) {
      uiToast({
        title: "Empty Query",
        description: "Please enter a query to analyze.",
        variant: "destructive",
      });
      return;
    }
    
    setIsAnalyzing(true);
    setResult(null);
    
    const startTime = Date.now();
    
    try {
      const { data, error } = await supabase.functions.invoke("gemini-query-analyzer", {
        body: { query: query.trim() },
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      const processingTime = Date.now() - startTime;
      setResult(data.result);
      
      uiToast({
        title: "Analysis Complete",
        description: `The query has been analyzed as: ${data.result}`,
      });
    } catch (error) {
      console.error("Error analyzing query:", error);
      uiToast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to analyze query. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  const downloadDataDictionary = async () => {
    try {
      setIsDownloading(true);
      console.log("Starting data dictionary download...");
      
      // Get all data from the data_dictionary table
      const { data, error } = await supabase
        .from("data_dictionary")
        .select("*");
        
      if (error) {
        console.error("Supabase error:", error);
        toast.error(`Failed to fetch data dictionary: ${error.message}`);
        return;
      }
      
      if (!data || data.length === 0) {
        console.warn("No data received from data_dictionary table");
        toast.error("The data dictionary is empty or could not be accessed.");
        return;
      }
      
      console.log(`Retrieved ${data.length} rows from data_dictionary table`);
      
      // Extract all column names from the first row
      const columnNames = Object.keys(data[0]);
      console.log("Available columns:", columnNames);
      
      // Generate CSV content
      const csvContent = [
        // Header row
        columnNames.join(","),
        // Data rows
        ...data.map(row => {
          return columnNames.map(colName => {
            // Properly escape cell values for CSV format
            const cellValue = row[colName] !== null && row[colName] !== undefined 
              ? String(row[colName]) 
              : "";
              
            // Escape quotes and wrap in quotes to handle commas, quotes, and newlines
            return `"${cellValue.replace(/"/g, '""')}"`;
          }).join(",");
        })
      ].join("\n");
      
      // Create and trigger download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "data_dictionary.csv");
      document.body.appendChild(link);
      
      console.log("Triggering download...");
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("Data dictionary downloaded successfully");
      console.log("Download complete");
    } catch (error) {
      console.error("Error downloading data dictionary:", error);
      toast.error(`Download failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsDownloading(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle className="text-xl">Query Analyzer</DialogTitle>
            <Button 
              variant="outline"
              size="sm"
              onClick={downloadDataDictionary}
              disabled={isDownloading}
              className="flex items-center gap-2"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Download Data Dictionary
                </>
              )}
            </Button>
          </div>
          <DialogDescription>
            Enter a query to analyze if it requires Memo App Dynamic Dashboards or Memo App Agentic Query
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col space-y-4 pt-2">
          <Textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your query here..."
            className="min-h-[150px]"
          />
          
          {result && (
            <div className={`p-4 rounded-md ${
              result === "Dynamic Dashboard" 
                ? "bg-green-50 border border-green-200 text-green-800" 
                : "bg-blue-50 border border-blue-200 text-blue-800"
            }`}>
              <p className="font-medium text-lg">{result}</p>
              <p className="text-sm mt-1 opacity-80">
                {result === "Dynamic Dashboard" 
                  ? "This query can be answered using Memo App's Dynamic Dashboards." 
                  : "This query would require Memo App's Agentic Query AI for an advanced analysis."}
              </p>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isAnalyzing}>
            Cancel
          </Button>
          <Button 
            onClick={analyzeQuery} 
            disabled={isAnalyzing || !query.trim()} 
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Analyze
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QueryAnalyzer;
