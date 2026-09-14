import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { InvestigationPage } from './pages/InvestigationPage';
import { CampaignsPage } from './pages/CampaignsPage';
import { IncidentHistoryPage } from './pages/IncidentHistoryPage';
import { ModelMetricsPage } from './pages/ModelMetricsPage';
import { ShieldAlert } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'investigate' | 'campaigns' | 'model' | 'history'>('dashboard');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  // Parse URL routing and deep links on mount and history navigation
  useEffect(() => {
    const parseUrlRoute = () => {
      try {
        const url = new URL(window.location.href);
        const searchParams = url.searchParams;
        const incidentParam = searchParams.get('incident') || searchParams.get('incident_id');
        const tabParam = searchParams.get('tab');
        const path = url.pathname;
        const hash = url.hash;

        // 1. Path-based /incident/:id or /campaigns/:id
        const incidentPathMatch = path.match(/^\/incident\/([a-zA-Z0-9_-]+)/);
        const campaignPathMatch = path.match(/^\/campaigns\/([a-zA-Z0-9_-]+)/);

        // 2. Hash-based #incident/:id or #/incident/:id
        const incidentHashMatch = hash.match(/^#\/?incident\/([a-zA-Z0-9_-]+)/);

        if (incidentParam) {
          setSelectedIncidentId(incidentParam);
          setActiveTab('investigate');
        } else if (incidentPathMatch) {
          setSelectedIncidentId(incidentPathMatch[1]);
          setActiveTab('investigate');
        } else if (incidentHashMatch) {
          setSelectedIncidentId(incidentHashMatch[1]);
          setActiveTab('investigate');
        } else if (campaignPathMatch) {
          setSelectedCampaignId(campaignPathMatch[1]);
          setActiveTab('campaigns');
        } else if (tabParam && ['dashboard', 'investigate', 'campaigns', 'model', 'history'].includes(tabParam)) {
          setActiveTab(tabParam as any);
        }
      } catch (err) {
        console.error('Error parsing route URL:', err);
      }
    };

    parseUrlRoute();
    window.addEventListener('popstate', parseUrlRoute);
    return () => window.removeEventListener('popstate', parseUrlRoute);
  }, []);

  const handleInvestigateIncident = (incidentId: string) => {
    setSelectedIncidentId(incidentId);
    setActiveTab('investigate');
    try {
      window.history.pushState(null, '', `/?incident=${encodeURIComponent(incidentId)}`);
    } catch {
      // Ignored in non-browser environments
    }
  };

  const handleNavigateToCampaign = (campaignId: string) => {
    setSelectedCampaignId(campaignId);
    setActiveTab('campaigns');
    try {
      window.history.pushState(null, '', `/?tab=campaigns&id=${encodeURIComponent(campaignId)}`);
    } catch {
      // Ignored
    }
  };

  const handleSelectTab = (tab: 'dashboard' | 'investigate' | 'campaigns' | 'model' | 'history') => {
    if (tab === 'investigate') setSelectedIncidentId(null);
    if (tab === 'campaigns') setSelectedCampaignId(null);
    setActiveTab(tab);
    try {
      window.history.pushState(null, '', tab === 'dashboard' ? '/' : `/?tab=${tab}`);
    } catch {
      // Ignored
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-red-500 selection:text-white">
      {/* Navbar */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
      />

      {/* Main Page Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardPage
            onInvestigateIncident={handleInvestigateIncident}
            onNavigateToTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'investigate' && (
          <InvestigationPage
            initialIncidentId={selectedIncidentId}
            onNavigateToCampaign={handleNavigateToCampaign}
          />
        )}

        {activeTab === 'campaigns' && (
          <CampaignsPage
            initialCampaignId={selectedCampaignId}
            onInvestigateIncident={handleInvestigateIncident}
          />
        )}

        {activeTab === 'history' && (
          <IncidentHistoryPage
            onSelectIncident={handleInvestigateIncident}
          />
        )}

        {activeTab === 'model' && (
          <ModelMetricsPage />
        )}
      </main>

      {/* SOC Footer */}
      <footer className="bg-slate-900 border-t border-slate-800/80 py-5 text-xs text-slate-400 font-mono">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <span>PhishX &bull; AI-Powered Phishing Investigation & SOC Response Platform</span>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-emerald-400 flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>FastAPI Backend Active</span>
            </span>
            <span>|</span>
            <span>Dataset: Hugging Face (mamtakumar)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
