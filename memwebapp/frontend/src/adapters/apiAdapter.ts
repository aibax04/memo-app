
// API adapter to convert between different data formats

// Convert dashboard from API format to application format
export const adaptApiDashboard = (apiDashboard: any) => {
  return {
    id: apiDashboard.id.toString(),
    name: apiDashboard.title || apiDashboard.name,
    description: apiDashboard.description || "",
    charts: [],
    createdAt: apiDashboard.created_at || new Date().toISOString()
  };
};

// Convert chart from API format to application format
export const adaptApiChart = (apiChart: any) => {
  return {
    id: apiChart.id.toString(),
    name: apiChart.title || apiChart.name,
    prompt: apiChart.config?.prompt || apiChart.prompt || "",
    type: apiChart.chart_type || apiChart.type,
    data: apiChart.config?.data || apiChart.data || {},
    createdAt: apiChart.created_at || new Date().toISOString(),
    bookmark: apiChart.bookmark || false,
    requiresAdvancedAnalysis: apiChart.config?.requiresAdvancedAnalysis || false,
    analysisExplanation: apiChart.config?.analysisExplanation,
    geminiDirectResponse: apiChart.config?.geminiDirectResponse
  };
};

// Convert application dashboard to API format for saving
export const adaptDashboardToApi = (dashboard: any) => {
  return {
    id: dashboard.id,
    title: dashboard.name,
    description: dashboard.description,
    // Add other fields as needed by the API
  };
};

// Convert application chart to API format for saving
export const adaptChartToApi = (chart: any, dashboardId?: string) => {
  return {
    id: chart.id,
    dashboard_id: dashboardId || chart.dashboardId,
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
};
