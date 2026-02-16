import React, { createContext, useState, useContext, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { mockConversations, Conversation } from "../data/mockData";
import { supabase, SUPABASE_ANON_KEY, saveDashboard, fetchDashboards, deleteDashboardFromDB, saveChart, fetchChartsForDashboard, deleteChartFromDB } from "@/integrations/supabase/client";
import { DataSource } from "@/types/conversations";
import { useAuth } from "@/context/AuthContext";
import { callApi } from '@/services/api';
import { config } from "process";

export type ChartType = "bar" | "line" | "pie" | "area" | "word-cloud" | "stacked-col" | "multi-bar" | "multi-line" | "multi-area";

export interface Chart {
  id: string;
  name: string;
  prompt: string;
  type: ChartType;
  data: {
    labels?: string[];
    datasets?: {
      data?: number[] | {name: string; data: number[]}[];
      labels?: string;
    };
    callIds?: string[][] | string[];
    filters?: string[];
    geminiResponse?: string;
    query?: string;
    retrieverSqlQueries?: string[];
    // data?:{
    //   labels?: string[];
    //   datasets?: any[];
    //   type?: ChartType;  
    // };
  };
  config?: {
    data?: {
      labels?: string[];
      datasets?: any[];
      callIds?: string[][] | string[];
    };
    callIds?: string[] | string[][];
    sql?: string;
    geminiResponse?: string;
    query?: string;
    filters?: any[];
  };
  requiresAdvancedAnalysis?: boolean;
  analysisExplanation?: string;
  sql?: string;
  geminiDirectResponse?: string;
  createdAt?: string;
  bookmark?: boolean;
}

export interface Dashboard {
  id: string;
  name: string;
  description: string;
  charts: Chart[];
  noOfCharts: number;
  createdAt: string;
  updatedAt: string;
  totalPages: number;
  currentPage: number;
}

type DashboardContextType = {
  dashboards: Dashboard[];
  selectedDashboard: Dashboard | null;
  setSelectedDashboard: (dashboard: Dashboard | null) => void;
  createDashboard: (name: string, description: string) => Promise<void>;
  updateDashboard: (id: string, name: string, description: string) => Promise<void>;
  deleteDashboard: (id: string) => Promise<void>;
  createChart: (dashboardId: string, name: string, prompt: string, forcedType?: string, dataSource?: DataSource) => Promise<boolean>;
  updateChart: (dashboardId: string, chartId: string, name: string, prompt: string, forcedType?: string, dataSource?: DataSource) => Promise<boolean>;
  deleteChart: (dashboardId: string, chartId: string) => Promise<void>;
  bookmarkChart: (chartId: string, bookmarked: boolean) => void;
  isChartBookmarked: (chartId: string) => boolean;
  getBookmarkedCharts: () => Chart[];
  refreshChartsWithFilters: (dashboardId: string, filters: Record<string, string>) => Promise<void>;
  conversations: Conversation[];
  deletedCharts: Chart[];
  fetchDashboard: (dashboardId: string, page?: number, limit?: number) => Promise<Dashboard | null>;
  loadMoreCharts: (dashboardId: string, page: number, limit: number) => Promise<void>;
};

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export { DashboardContext };

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth(); // Get user from AuthContext
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [selectedDashboard, setSelectedDashboard] = useState<Dashboard | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [bookmarkedChartIds, setBookmarkedChartIds] = useState<string[]>([]);
  const [dbConversations, setDbConversations] = useState<any[]>([]);
  const [deletedCharts, setDeletedCharts] = useState<Chart[]>([]);
  const [dishTvConversations, setDishTvConversations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Load bookmarks from localStorage on mount
  useEffect(() => {
    const storedBookmarks = localStorage.getItem("bookmarkedCharts");
    if (storedBookmarks) {
      setBookmarkedChartIds(JSON.parse(storedBookmarks));
    }
    
    const storedDeletedCharts = localStorage.getItem("deletedCharts");
    if (storedDeletedCharts) {
      setDeletedCharts(JSON.parse(storedDeletedCharts));
    }
  }, []);

  // Save bookmarks to localStorage when they change
  useEffect(() => {
    console.log("Saving bookmarked charts to localStorage:", bookmarkedChartIds);
    localStorage.setItem("bookmarkedCharts", JSON.stringify(bookmarkedChartIds));
  }, [bookmarkedChartIds]);

  useEffect(() => {
    localStorage.setItem("deletedCharts", JSON.stringify(deletedCharts));
  }, [deletedCharts]);

  // Load conversations and dashboards from Supabase and mock data
  // This useEffect will re-run whenever the user changes
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);

        // Process mock conversations
        const processedConversations = mockConversations.map(conversation => {
          if (!conversation.messages || conversation.messages.length === 0) {
            return conversation;
          }
          
          const conversationStartTime = new Date(conversation.timestamp).getTime();
          const durationInMs = conversation.duration * 1000;
          
          const timeIncrement = durationInMs / (conversation.messages.length - 1 || 1);
          
          const messagesWithTimestamps = conversation.messages.map((message, index) => {
            const messageTime = new Date(conversationStartTime + (index * timeIncrement));
            return {
              ...message,
              timestamp: messageTime.toISOString()
            };
          });
          
          return {
            ...conversation,
            messages: messagesWithTimestamps
          };
        });
        
        setConversations(processedConversations);
        
        // Load dashboards from Supabase - now passing user ID if available
        await loadDashboardsFromDb();
        
        setIsLoading(false);
      } catch (error) {
        console.error("Error loading initial data:", error);
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [user]); // Re-run when the user changes

  // Load dashboards from Supabase
  const loadDashboardsFromDb = async () => {
    try {      
      // Pass user ID if available, otherwise fallback to default
      const userId = user?.id || "1";
      console.log("Loading dashboards for user:", userId);
      
      const { data: dashboardsData, error } = await fetchDashboards(userId);
      
      if (error) {
        console.error("Error loading dashboards:", error);
        toast.error("Error loading dashboards. Using local data instead.");
        return;
      }
      
      if (!dashboardsData || dashboardsData.length === 0) {
        return;
      }
      
      // Load charts for each dashboard
      const dashboardsWithCharts: Dashboard[] = [];
      
      for (const dbDashboard of dashboardsData) {    
        dashboardsWithCharts.push({
          id: dbDashboard.id,
          name: dbDashboard.name,
          description: dbDashboard.description || "",
          // charts: chartsData || [],
          charts: [],
          noOfCharts: dbDashboard.noOfCharts || 0,
          createdAt: dbDashboard.created_at,
          updatedAt: dbDashboard.updated_at || new Date().toISOString(),
          totalPages: dbDashboard.totalPages || 5,
          currentPage: dbDashboard.currentPage
        });

      }
      
      setDashboards(dashboardsWithCharts);
        
    } catch (error) {
      console.error("Error loading dashboards from database:", error);
      toast.error("Failed to load dashboards from database. Using local data instead.");
    }
  };

  const bookmarkChart = (chartId: string, bookmarked: boolean) => {
    if (bookmarked) {
      console.log("Bookmarked by me")
      if (!bookmarkedChartIds.includes(chartId)) {
        console.log("Adding chart to bookmarks:", chartId);
        setBookmarkedChartIds([...bookmarkedChartIds, chartId]);
        toast.success("Chart bookmarked");
      }
    } else {
      setBookmarkedChartIds(bookmarkedChartIds.filter(id => id !== chartId));
      toast.success("Chart removed from bookmarks");
    }
  };

  const isChartBookmarked = (chartId: string): boolean => {
    return bookmarkedChartIds.includes(chartId);
  };

  const getBookmarkedCharts = (): Chart[] => {
    const allBookmarkedCharts: Chart[] = [];
    
    dashboards.forEach(dashboard => {
      dashboard.charts.forEach(chart => {
        if (chart.bookmark) {
          allBookmarkedCharts.push(chart);
        }
      });
    });
    
    return allBookmarkedCharts;
  };

  const refreshChartsWithFilters = async (dashboardId: string, filters: Record<string, string>) => {
    
  };

  const processWordCloudWithAI = async (prompt: string, filters: Record<string, string> = {}, explicitDataSource?: string) => {
    try {
      console.log("🚀 Starting word cloud generation with prompt:", prompt, "and filters:", filters, "explicitDataSource:", explicitDataSource);

      // CRITICAL FIX: Force dataSource to dishtv for all word cloud requests
      // This ensures we always use DishTV data for word clouds as required
      const dataSourceToUse = 'dishtv';

      // For DishTV, we don't need to send conversation data as the edge function will fetch it
      let conversationData: any[] = [];
      
      // We'll still map the data for logging purposes, but the edge function will ignore it
      if (dishTvConversations.length > 0) {
        // Map for debugging/logging only
        conversationData = dishTvConversations.map(conv => ({
          id: String(conv.id || ''),
          customer_id: String(conv.smsid || conv['Sequence Number'] || ''),
          customer_name: String(conv.smsid || conv['Sequence Number'] || ''),
          agent_id: conv['Agent ID'] || '',
          category: conv.call_type || 'unknown',
          sentiment: conv.sentiment || 'neutral',
          satisfaction_score: 3,
          duration: Number(conv.Duration || 0),
          resolved: true,
          timestamp: conv['Call Start Time'] || '',
          score: 3,
          conversation: conv.transcript || '',
          messages: []
        }));
      }
      // Apply filters for logging purposes
      if (Object.keys(filters).filter(f => f !== 'dataSource').length > 0) {
        const preFilterCount = conversationData.length;
        conversationData = conversationData.filter(conversation => {
          return Object.entries(filters).every(([key, value]) => {
            if (!value || key === 'dataSource') return true;
            
            if (key === 'resolved') {
              return String(conversation[key]) === value;
            }
            
            if (key === 'timestamp' && conversation.timestamp) {
              const convoDate = new Date(conversation.timestamp).toISOString().split('T')[0];
              return convoDate === value;
            }
            
            if (key === 'duration' && conversation.duration) {
              return Number(conversation.duration) <= Number(value);
            }
            
            if (conversation[key] && typeof conversation[key] === 'string') {
              return conversation[key].toLowerCase().includes(value.toLowerCase());
            }
            
            return true;
          });
        });
      }

      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token || '';

      // CRITICAL FIX: Do NOT send conversation data to the edge function
      // Instead, let the edge function fetch the data directly from the database
      const requestBody = { 
        prompt: prompt,
        dataSource: dataSourceToUse,
        filters: filters
      };

      const aiResponse = await fetch('https://ykgpasnsxknudhqarmfp.supabase.co/functions/v1/gemini-word-cloud', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        throw new Error(`Word cloud API error: ${aiResponse.status} ${errorText}`);
      }

      const responseData = await aiResponse.json();

      if (responseData.error) {
        throw new Error(responseData.error);
      }

      if (!responseData.processedWords) {
        throw new Error('No processed words from DishTV data');
      }

      const processedWords = responseData.processedWords;

      return {
        labels: processedWords.map((w: any) => w.word),
        datasets: [{
          label: "Word Frequency",
          data: processedWords.map((w: any) => w.frequency),
          backgroundColor: "#4E79A7",
        }]
      };

    } catch (error) {
      if ((filters.dataSource || explicitDataSource) === 'dishtv') {
        throw error;
      }

      // For Memo App fallback
      return processWordOccurrences(filters);
    }
  };

  const processWordOccurrences = (filters: Record<string, string> = {}) => {
    const wordCounts: Record<string, number> = {};
    
    let conversationData = dbConversations.length > 0 ? dbConversations : conversations;
    
    if (Object.keys(filters).length > 0) {
      conversationData = conversationData.filter(conversation => {
        return Object.entries(filters).every(([key, value]) => {
          if (!value) return true;
          
          if (key === 'resolved') {
            return String(conversation[key]) === value;
          }
          
          if (key === 'date_from') {
            return `DATE("Call Start Time") >= DATE('${value}')`;
          }
          
          if (key === 'date_to') {
            return `DATE("Call Start Time") <= DATE('${value}')`;
          }
          
          if (key === 'duration_max') {
            return `"Duration" <= ${Number(value)}`;
          }
          
          return `${key} ILIKE '%${value}%'`;
        });
      });
    }
    
    conversationData.forEach((conversation) => {
      let messageTexts: string[] = [];
      
      if (conversation.messages && Array.isArray(conversation.messages)) {
        messageTexts = conversation.messages
          .map(msg => msg.text || '')
          .join(' ')
          .toLowerCase()
          .replace(/[^\w\s]/g, '')
          .split(/\s+/)
          .filter(word => word.length > 2);
      }
      
      messageTexts.forEach(word => {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      });
    });
    
    const sortedWords = Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50);
    
    return {
      labels: sortedWords.map(([word]) => word),
      datasets: [{
        label: "Word Frequency",
        data: sortedWords.map(([_, count]) => count),
        backgroundColor: "#8b5cf6",
      }]
    };
  };

  const processPromptWithFilters = async (prompt: string, chartType: ChartType, filters: Record<string, string> = {}, dataSource: DataSource = 'memoapp'): Promise<{ data: Record<string, any>; type: ChartType; requiresAdvancedAnalysis?: boolean; analysisExplanation?: string; geminiDirectResponse?: string } | null> => {
    try {
      console.log("🚀 Processing prompt with filters:", prompt, filters);
    

      if (chartType === "word-cloud") {
        const data = await processWordCloudWithAI(prompt, filters);
        return { data, type: "word-cloud" };
      }

      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token || '';
      
      // Format filters for the API
      const sqlFilters = Object.entries(filters)
        .filter(([_, value]) => value !== undefined && value !== '')
        .map(([key, value]) => {
          if (key === 'resolved') {
            return `${key} = ${value === 'true'}`;
          }
          
          if (key === 'date_from') {
            return `DATE("Call Start Time") >= DATE('${value}')`;
          }
          
          if (key === 'date_to') {
            return `DATE("Call Start Time") <= DATE('${value}')`;
          }
          
          if (key === 'duration_max') {
            return `"Duration" <= ${Number(value)}`;
          }
          
          return `${key} ILIKE '%${value}%'`;
        });

      // Always use dishtv data
      const dataSourceToUse = "dishtv";

      // Call our new unified chart analysis function
      const requestBody = {
        prompt,
        filters: sqlFilters,
        dataSource: dataSourceToUse
      };

      const response = await fetch('https://ykgpasnsxknudhqarmfp.supabase.co/functions/v1/unified-chart-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("🔴 Error response from API:", errorText);
        throw new Error(`API error: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        console.error("🔴 API returned success: false");
        throw new Error(result.error || 'Failed to process prompt with filters');
      }

      return {
        data: result.data,
        type: result.chartType as ChartType,
        requiresAdvancedAnalysis: result.requiresAdvancedAnalysis || false,
        analysisExplanation: result.analysisExplanation,
        geminiDirectResponse: result.geminiDirectResponse,
      };
    } catch (error) {
      console.error("🔴 Error processing prompt with filters:", error);
      
      toast.error("Failed to process your query with filters. Please try again.");
      return null;
    }
  };

  const processPrompt = async (prompt: string, forcedType?: ChartType, dataSource: DataSource = 'memoapp'): Promise<{ data: Record<string, any>; type: ChartType; requiresAdvancedAnalysis?: boolean; analysisExplanation?: string; geminiDirectResponse?: string } | null> => {
    try {    
      // Process the prompt with AI to get chart data and other analysis
      const result = await processPromptWithFilters(prompt, forcedType as ChartType, {}, dataSource);
    
      if (!result) {
        throw new Error('Failed to process prompt');
      }
    
      const { data, type, requiresAdvancedAnalysis, analysisExplanation, geminiDirectResponse } = result;
    
      return {
        data,
        type: forcedType || type,
        requiresAdvancedAnalysis,
        analysisExplanation,
        geminiDirectResponse
      };
    } catch (error) {
      console.error("Error processing prompt:", error);
      
      toast.error("Failed to generate chart. Please try a different query.");
      return null;
    }
  };

  const createDashboard = async (title: string, description?: string): Promise<any> => {
    console.log('📊 Creating new dashboard:', title);
    const response = await callApi('/dashboards/', 'POST', { title, description });
    
    // Log the response for debugging
    console.log('Dashboard creation response:', response);
    console.log('Dashboard creation response data:', response?.id);
    
    if (response && !response.error) {
      // Ensure we have a valid dashboard ID
      const dashboardId = response.id || response.dashboard_id;
      
      if (!dashboardId) {
        console.warn('Dashboard created but no ID returned from API');
      } else {
        console.log(`Dashboard created successfully with ID: ${dashboardId}`);
      }
    }
    
    return response;
  };

  const updateDashboard = async (id: string, name: string, description: string) => {
    try {
      // Get user ID from Auth context or use default mock user
      const userId = user?.id || "1";
      
      // Save to Supabase first with userId
      const { error } = await saveDashboard({
        id,
        name,
        description,
        userId
      });
      
      if (error) {
        console.error("Error updating dashboard in Supabase:", error);
        throw new Error("Failed to update dashboard. Database error.");
      }
      
      // Update local state after successful save
      const updatedDashboards = dashboards.map((dashboard) => {
        if (dashboard.id === id) {
          return { ...dashboard, name, description };
        }
        return dashboard;
      });
      
      setDashboards(updatedDashboards);
      
      if (selectedDashboard?.id === id) {
        setSelectedDashboard({ ...selectedDashboard, name, description, updatedAt: new Date().toISOString() });
      }
    } catch (error) {
      console.error("Error updating dashboard:", error);
      throw error;
    }
  };

  const deleteDashboard = async (id: string) => {
    try {
      // Get user ID from Auth context or use default mock user
      const userId = user?.id || "1";
      
      // Delete from Supabase first, passing the userId
      const { error } = await deleteDashboardFromDB(id, userId);
      
      if (error) {
        console.error("Error deleting dashboard from Supabase:", error);
        throw new Error("Failed to delete dashboard. Database error.");
      }
      
      // Update local state after successful delete
      const updatedDashboards = dashboards.filter((dashboard) => dashboard.id !== id);
      setDashboards(updatedDashboards);
      
      if (selectedDashboard?.id === id) {
        setSelectedDashboard(null);
      }
    } catch (error) {
      console.error("Error deleting dashboard:", error);
      throw error;
    }
  };

  const createChart = async (
    dashboardId: string, 
    name: string, 
    prompt: string, 
    forcedType?: string,
    dataSource: DataSource = 'memoapp'
  ): Promise<boolean> => {
    try {
      
      const processedData = await processPrompt(prompt, forcedType as ChartType, dataSource);
      
      if (!processedData) {
        toast.error("Unable to create chart. Please try a different prompt.");
        return false;
      }
      
      const { data, type, requiresAdvancedAnalysis, analysisExplanation, geminiDirectResponse } = processedData;
      
      const chartId = crypto.randomUUID();
      
      // Get user ID from Auth context or use default mock user
      const userId = user?.id || "1";
      
      const newChart: Chart = {
        id: chartId,
        name,
        prompt,
        type,
        data,
        createdAt: new Date().toISOString(),
        bookmark: false,
        requiresAdvancedAnalysis,
        analysisExplanation,
        geminiDirectResponse,
      };
      
      // Save to Supabase first with userId
      const { error } = await saveChart({
        id: chartId,
        dashboardId,
        name,
        prompt,
        type,
        data,
        requiresAdvancedAnalysis,
        analysisExplanation,
        geminiDirectResponse,
        userId,
      });
      
      if (error) {
        console.error("Error saving chart to Supabase:", error);
        toast.error("Error creating chart");
        return false;
      }
      
      // Update local state after successful save
      const updatedDashboards = dashboards.map((dashboard) => {
        if (dashboard.id === dashboardId) {
          return { ...dashboard, charts: [...dashboard.charts, newChart] };
        }
        return dashboard;
      });
      
      setDashboards(updatedDashboards);
      
      if (selectedDashboard?.id === dashboardId) {
        setSelectedDashboard({
          ...selectedDashboard,
          charts: [...selectedDashboard.charts, newChart],
        });
      }
      
      toast.success("Chart created successfully");
      return true;
    } catch (error) {
     
      toast.error("An error occurred while creating the chart");
      console.error("Chart creation error:", error);
      return false;
    }
  };

  const updateChart = async (
    dashboardId: string, 
    chartId: string, 
    name: string, 
    prompt: string, 
    forcedType?: string,
    dataSource: DataSource = 'memoapp'
  ): Promise<boolean> => {
    try {      
      const processedData = await processPrompt(prompt, forcedType as ChartType, dataSource);
      
      if (!processedData) {
        toast.error("Unable to update chart. Please try a different prompt.");
        return false;
      }
      
      const { data, type, requiresAdvancedAnalysis, analysisExplanation, geminiDirectResponse } = processedData;
      
      // Get user ID from Auth context or use default mock user
      const userId = user?.id || "1";
      
      // Save to Supabase first with userId
      const { error } = await saveChart({
        id: chartId,
        dashboardId,
        name,
        prompt,
        type: forcedType ? (forcedType as ChartType) : type,
        data,
        requiresAdvancedAnalysis,
        analysisExplanation,
        geminiDirectResponse,
        userId
      });
      
      if (error) {
        console.error("Error updating chart in Supabase:", error);
        toast.error("Error updating chart");
        return false;
      }
      
      // Update local state after successful save
      const updatedDashboards = dashboards.map((dashboard) => {
        if (dashboard.id === dashboardId) {
          const updatedCharts = dashboard.charts.map((chart) => {
            if (chart.id === chartId) {
              return {
                ...chart,
                name,
                prompt,
                type: forcedType ? (forcedType as ChartType) : type,
                data,
                requiresAdvancedAnalysis,
                analysisExplanation,
                geminiDirectResponse
              };
            }
            return chart;
          });
          
          return { ...dashboard, charts: updatedCharts };
        }
        return dashboard;
      });
      
      setDashboards(updatedDashboards);
      
      if (selectedDashboard?.id === dashboardId) {
        const updatedCharts = selectedDashboard.charts.map((chart) => {
          if (chart.id === chartId) {
            return {
              ...chart,
              name,
              prompt,
              type: forcedType ? (forcedType as ChartType) : type,
              data,
              requiresAdvancedAnalysis,
              analysisExplanation,
              geminiDirectResponse
            };
          }
          return chart;
        });
        
        setSelectedDashboard({
          ...selectedDashboard,
          charts: updatedCharts,
        });
      }
      
      toast.success("Chart updated successfully");
      return true;
    } catch (error) {
      
      toast.error("An error occurred while updating the chart");
      console.error("Chart update error:", error);
      return false;
    }
  };

  const deleteChart = async (dashboardId: string, chartId: string) => {
    try {
      const dashboardToUpdate = dashboards.find(d => d.id === dashboardId);
      const chartToDelete = dashboardToUpdate?.charts.find(c => c.id === chartId);
  
      if (chartToDelete) {
        setDeletedCharts([...deletedCharts, chartToDelete]);
      }
  
      // Delete from Supabase first, passing the userId
      const { error } = await deleteChartFromDB(chartId);
      
      if (error) {
        console.error("Error deleting chart from Supabase:", error);
        toast.error("Error deleting chart");
        throw error;
      }
      
      // Update local state after successful delete
      const updatedDashboards = dashboards.map((dashboard) => {
        if (dashboard.id === dashboardId) {
          const updatedCharts = dashboard.charts.filter((chart) => chart.id !== chartId);
          return { ...dashboard, charts: updatedCharts };
        }
        return dashboard;
      });
      
      setDashboards(updatedDashboards);
      
      if (selectedDashboard?.id === dashboardId) {
        const updatedCharts = selectedDashboard.charts.filter((chart) => chart.id !== chartId);
        setSelectedDashboard({ ...selectedDashboard, charts: updatedCharts });
      }
      
      if (bookmarkedChartIds.includes(chartId)) {
        setBookmarkedChartIds(bookmarkedChartIds.filter(id => id !== chartId));
      }
      
      toast.success("Chart deleted successfully");
    } catch (error) {
      console.error("Error deleting chart:", error);
      toast.error("Failed to delete chart");
      throw error;
    }
  };

  // Add the fetchDashboard function
  const fetchDashboard = async (dashboardId: string, page: number = 1, limit: number = 6): Promise<Dashboard | null> => {
    try {

      const existingDashboard = dashboards.find(d => d.id === dashboardId);
      
      if (!existingDashboard) {
        console.error(`Dashboard with ID ${dashboardId} not found in local state`);
        return null;
      }
      
      const { getDashboard } = await import('@/services/api');
      const dashboardData = await getDashboard(dashboardId, page, limit);
      console.log('pcr4', dashboardData)
      
      if (dashboardData.error) {
        console.error("Error fetching dashboard:", dashboardData.error);
        toast.error(`Failed to fetch dashboard: ${dashboardData.error}`);
        return null;
      }
      
      if (!dashboardData.charts) {
        dashboardData.charts = [];
      }
      
      const updatedDashboard: Dashboard = {
        id: existingDashboard.id,
        name: dashboardData.name || existingDashboard.name,
        description: dashboardData.description || existingDashboard.description,
        charts: dashboardData.charts || [],
        noOfCharts: dashboardData.noOfCharts,
        createdAt: existingDashboard.createdAt,
        updatedAt: dashboardData.updated_at || existingDashboard.updatedAt || "1Jan1970",
        totalPages: dashboardData.totalPages,
        currentPage: page
      };
      
      const updatedDashboards = dashboards.map(d => 
        d.id === dashboardId ? updatedDashboard : d
      );
      
      setDashboards(updatedDashboards);
      
      if (selectedDashboard?.id === dashboardId) {
        setSelectedDashboard(updatedDashboard);
      }
      
      return updatedDashboard;
    } catch (error) {
      console.error("Error fetching dashboard:", error);
      toast.error("Failed to fetch dashboard");
      return null;
    }
  };

  const loadMoreCharts = async (dashboardId: string, page: number, limit: number) => {
    try {

      const { getDashboard } = await import('@/services/api');
      const dashboardData = await getDashboard(dashboardId, page, limit);

      if (dashboardData.error) {
        console.error("Error loading more charts:", dashboardData.error);
        toast.error(`Failed to load more charts: ${dashboardData.error}`);
        return;
      }

      // Update the dashboard with new charts
      const updatedDashboard = {
        ...selectedDashboard,
        charts: [...(selectedDashboard?.charts || []), ...(dashboardData.charts || [])],
        totalPages: dashboardData.totalPages,
        currentPage: page
      };

      setSelectedDashboard(updatedDashboard);

      // Update the dashboards array
      const updatedDashboards = dashboards.map(d => 
        d.id === dashboardId ? updatedDashboard : d
      );
      
      setDashboards(updatedDashboards);

    } catch (error) {
      console.error("Error loading more charts:", error);
      toast.error("Failed to load more charts");
    }
  };

  return (
    <DashboardContext.Provider
      value={{
        dashboards,
        selectedDashboard,
        setSelectedDashboard,
        createDashboard,
        updateDashboard,
        deleteDashboard,
        createChart,
        updateChart,
        deleteChart,
        bookmarkChart,
        isChartBookmarked,
        getBookmarkedCharts,
        refreshChartsWithFilters,
        conversations,
        deletedCharts,
        fetchDashboard,
        loadMoreCharts,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
};
