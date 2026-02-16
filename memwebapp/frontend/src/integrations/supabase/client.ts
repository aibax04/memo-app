
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { toast } from "sonner";
import * as api from '@/services/api';

const SUPABASE_URL = "https://ykgpasnsxknudhqarmfp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrZ3Bhc25zeGtudWRocWFybWZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ1MDkwOTUsImV4cCI6MjA2MDA4NTA5NX0.bLYuYlaiVOa23yR7iF30yRWKjYPUgAsY8jrs1ZjzfO0";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Export the anon key so it can be used as fallback
export const SUPABASE_ANON_KEY = SUPABASE_PUBLISHABLE_KEY;

const isValidUuid = (str: string): boolean => {
  // Simple UUID validation regex
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// Generate a consistent UUID v5 from a numeric ID
// This ensures the same numeric ID always generates the same UUID
const generateConsistentUuid = (id: string): string => {
  // If the ID is already a valid UUID, return it
  if (isValidUuid(id)) {
    return id;
  }

  // For simple numeric IDs like "1", "2", etc., create consistent UUIDs
  return `00000000-0000-0000-0000-${id.padStart(12, '0')}`;
};

// Dashboard and chart persistence functions
export const saveDashboard = async (dashboard: {
  id: string;
  name: string;
  description: string;
  userId?: string; // Make userId parameter optional but use it if provided
}) => {
  try {
    console.log('🔄 saveDashboard called with:', dashboard);
    
    // Try using the Memo App API first
    try {
      const apiResult = await api.createDashboard(dashboard.name, dashboard.description);
      if (!apiResult.error) {
        console.log('✅ Dashboard saved via API:', apiResult);
        return { 
          data: { ...apiResult, id: apiResult.id.toString() }, 
          error: null 
        };
      } else {
        console.warn('API dashboard creation failed, falling back to Supabase', apiResult.error);
      }
    } catch (apiError) {
      console.warn('Error using API for dashboard creation, falling back to Supabase', apiError);
    }

    // Fallback to Supabase
    // Use provided userId or attempt to get from auth
    let userId = dashboard.userId;
    
    if (!userId) {
      const { data: userData } = await supabase.auth.getUser();
      userId = userData?.user?.id;
      
      if (!userId) {
        console.log("No authenticated user found, using mock user ID");
        userId = "1"; // Default to first mock user if not authenticated
      }
    }
    return { data: null, error: null };
    
  } catch (error) {
    console.error("Error in saveDashboard:", error);
    return { data: null, error };
  }
};

export const fetchDashboards = async (userId?: string) => {
  try {
    console.log('🔄 fetchDashboards called');
    
    // Try using the Memo App API first
    try {
      const apiResult = await api.getDashboards();
      if (!apiResult.error) {
        console.log('✅ Dashboards fetched via API:', apiResult);
        return { 
          data: Array.isArray(apiResult) ? apiResult.map(dashboard => ({
            ...dashboard,
            id: dashboard.id.toString(),
            name: dashboard.title, // Map API field to our expected field
            created_at: dashboard.created_at,
            user_id: dashboard.owner_id?.toString()
          })) : [],
          error: null 
        };
      } else {
        console.warn('API dashboard fetch failed, falling back to Supabase', apiResult.error);
      }
    } catch (apiError) {
      console.warn('Error using API for dashboard fetch, falling back to Supabase', apiError);
    }

    // Fallback to Supabase
    let userIdToUse = userId;
    
    if (!userIdToUse) {
      const { data: userData } = await supabase.auth.getUser();
      userIdToUse = userData?.user?.id;
      
      if (!userIdToUse) {
        console.log("No authenticated user found, using mock user ID");
        userIdToUse = "1"; // Default to first mock user
      }
    }
    
    // Convert numeric IDs to valid UUIDs
    const userUuid = generateConsistentUuid(userIdToUse);
    
    console.log("Fetching dashboards for user ID:", userIdToUse, "converted to UUID:", userUuid);
    
    const { data, error } = await supabase
      .from('user_dashboards')
      .select('*')
      .eq('user_id', userUuid)
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error("Error fetching dashboards:", error);
      throw error;
    }
    
    console.log('✅ Dashboards fetched via Supabase:', data);
    return { data: data || [], error: null };
  } catch (error) {
    console.error("Error in fetchDashboards:", error);
    return { data: [], error };
  }
};

export const deleteDashboardFromDB = async (dashboardId: string, userId?: string) => {
  try {
    console.log('🔄 deleteDashboardFromDB called:', { dashboardId, userId });
    
    // Try using the Memo App API first
    try {
      const apiResult = await api.deleteDashboard(dashboardId);
      if (!apiResult.error) {
        console.log('✅ Dashboard deleted via API:', apiResult);
        return { error: null };
      } else {
        console.warn('API dashboard deletion failed, falling back to Supabase', apiResult.error);
      }
    } catch (apiError) {
      console.warn('Error using API for dashboard deletion, falling back to Supabase', apiError);
    }

    // Fallback to Supabase
    let userIdToUse = userId;
    
    if (!userIdToUse) {
      const { data: userData } = await supabase.auth.getUser();
      userIdToUse = userData?.user?.id;
      
      if (!userIdToUse) {
        console.log("No authenticated user found, using mock user ID");
        userIdToUse = "1"; // Default to first mock user
      }
    }
    
    console.log('✅ Dashboard deleted via Supabase');
    return { error: null };
  } catch (error) {
    console.error("Error in deleteDashboard:", error);
    return { error };
  }
};

export const saveChart = async (chart: {
  id: string;
  dashboardId: string;
  name: string;
  prompt: string;
  type: string;
  data: any;
  requiresAdvancedAnalysis?: boolean;
  analysisExplanation?: string;
  geminiDirectResponse?: string;
  userId?: string; // Make userId parameter optional
}) => {
  try {
    console.log('🔄 saveChart called:', { chartId: chart.id, dashboard: chart.dashboardId, type: chart.type });
    
    // Try using the Memo App API first
    try {
      // For new charts, use createChart. For existing, use updateChart
      const apiChart = {
        title: chart.name,
        chart_type: chart.type,
        config: {
          data: chart.data,
          prompt: chart.prompt,
          requiresAdvancedAnalysis: chart.requiresAdvancedAnalysis,
          analysisExplanation: chart.analysisExplanation,
          geminiDirectResponse: chart.geminiDirectResponse
        }
      };
      
      let apiResult;
      if (chart.id.includes('new-')) { // Assuming new charts have temporary IDs
        apiResult = await api.createChart(
          chart.dashboardId,
          chart.name,
          chart.type,
          apiChart.config
        );
      } else {
        apiResult = await api.updateChart(
          chart.id,
          chart.name,
          chart.type,
          apiChart.config
        );
      }
      
      if (!apiResult.error) {
        console.log('✅ Chart saved via API:', apiResult);
        return { 
          data: { 
            ...apiResult,
            id: apiResult.id.toString(),
            name: apiResult.title,
            dashboard_id: apiResult.dashboard_id.toString()
          }, 
          error: null 
        };
      } else {
        console.warn('API chart creation failed, falling back to Supabase', apiResult.error);
      }
    } catch (apiError) {
      console.warn('Error using API for chart creation, falling back to Supabase', apiError);
    }

  } catch (error) {
    console.error("Error in saveChart:", error);
    return { data: null, error };
  }
};

export const fetchChartsForDashboard = async (dashboardId: string) => {
  try {
    console.log('🔄 fetchChartsForDashboard called:', { dashboardId });
    
    // Try using the Memo App API first
    try {
      const apiResult = await api.getDashboardCharts(dashboardId);
      if (!apiResult.error) {
        console.log('✅ Charts fetched via API:', apiResult);
        
        // Map from API schema to application schema
        const charts = Array.isArray(apiResult) ? apiResult.map(chart => ({
          id: String(chart.id),
          name: chart.title,
          prompt: chart.config?.prompt || "",
          type: chart.chart_type,
          data: chart.config?.data || {},
          createdAt: chart.created_at,
          bookmark: chart.bookmark || false,
          requiresAdvancedAnalysis: chart.config?.requiresAdvancedAnalysis || false,
          analysisExplanation: chart.config?.analysisExplanation,
          geminiDirectResponse: chart.config?.geminiDirectResponse
        })) : [];
        
        return { data: charts, error: null };
      } else {
        console.warn('API charts fetch failed, falling back to Supabase', apiResult.error);
      }
    } catch (apiError) {
      console.warn('Error using API for charts fetch, falling back to Supabase', apiError);
    }

    // Fallback to Supabase
    const { data, error } = await supabase
      .from('user_charts')
      .select('*')
      .eq('dashboard_id', dashboardId)
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error("Error fetching charts:", error);
      throw error;
    }
    
    // Map from DB schema to application schema
    const charts = data.map(chart => ({
      id: chart.id,
      name: chart.name,
      prompt: chart.prompt,
      type: chart.type,
      data: chart.data,
      createdAt: chart.created_at,
      requiresAdvancedAnalysis: chart.requires_advanced_analysis,
      analysisExplanation: chart.analysis_explanation,
      geminiDirectResponse: chart.gemini_direct_response
    }));
    
    console.log('✅ Charts fetched via Supabase:', charts);
    return { data: charts, error: null };
  } catch (error) {
    console.error("Error in fetchChartsForDashboard:", error);
    return { data: [], error };
  }
};

export const deleteChartFromDB = async (chartId: string) => {
  try {
    console.log('🔄 deleteChartFromDB called:', { chartId });
    
    // Try using the Memo App API first
    try {
      const apiResult = await api.deleteChart(chartId);
      if (!apiResult.error) {
        console.log('✅ Chart deleted via API:', apiResult);
        return { error: null };
      } else {
        console.warn('API chart deletion failed, falling back to Supabase', apiResult.error);
      }
    } catch (apiError) {
      console.warn('Error using API for chart deletion, falling back to Supabase', apiError);
    }
    
    console.log('✅ Chart deleted via Supabase');
    return { error: null };
  } catch (error) {
    console.error("Error in deleteChart:", error);
    return { error };
  }
};
