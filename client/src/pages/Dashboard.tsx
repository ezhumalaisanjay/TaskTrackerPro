import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "wouter";
import { Sidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Overview } from "@/components/dashboard/overview";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { StagePerformance } from "@/components/dashboard/stage-performance";
import { Statistics } from "@/components/dashboard/statistics";
import RawMaterialForm from "@/components/stage-forms/RawMaterialForm";
import SlugCuttingForm from "@/components/stage-forms/SlugCuttingForm";
import DeburringForm from "@/components/stage-forms/DeburringForm";
import HeatingForgingForm from "@/components/stage-forms/HeatingForgingForm";
import TrimmingForm from "@/components/stage-forms/TrimmingForm";
import FettlingForm from "@/components/stage-forms/FettlingForm";
import InProcessInspectionForm from "@/components/stage-forms/InProcessInspectionForm";
import ShotBlastingForm from "@/components/stage-forms/ShotBlastingForm";
import HardeningTemperingForm from "@/components/stage-forms/HardeningTemperingForm";
import PostBlastInspectionForm from "@/components/stage-forms/PostBlastInspectionForm";
import MachiningForm from "@/components/stage-forms/MachiningForm";
import NitratingForm from "@/components/stage-forms/NitratingForm";
import FinalInspectionForm from "@/components/stage-forms/FinalInspectionForm";
import OilingPackingForm from "@/components/stage-forms/OilingPackingForm";
import DispatchForm from "@/components/stage-forms/DispatchForm";

export default function Dashboard() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [activeStage, setActiveStage] = useState<number | null>(null);

  useEffect(() => {
    // Redirect to login if not authenticated and not loading
    if (!isAuthenticated && !loading) {
      setLocation("/login");
    }
  }, [isAuthenticated, loading, setLocation]);

  const handleStageSelect = (stageNumber: number) => {
    setActiveTab("process");
    setActiveStage(stageNumber);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will be redirected by the effect
  }

  // Render the appropriate stage form based on activeStage
  const renderStageForm = () => {
    switch (activeStage) {
      case 1:
        return <RawMaterialForm />;
      case 2:
        return <SlugCuttingForm />;
      case 3:
        return <DeburringForm />;
      case 4:
        return <HeatingForgingForm />;
      case 5:
        return <TrimmingForm />;
      case 6:
        return <FettlingForm />;
      case 7:
        return <InProcessInspectionForm />;
      case 8:
        return <ShotBlastingForm />;
      case 9:
        return <HardeningTemperingForm />;
      case 10:
        return <PostBlastInspectionForm />;
      case 11:
        return <MachiningForm stage={1} />;
      case 12:
        return <MachiningForm stage={2} />;
      case 13:
        return <MachiningForm stage={3} />;
      case 14:
        return <HardeningTemperingForm />;
      case 15:
        return <NitratingForm />;
      case 16:
        return <FinalInspectionForm />;
      case 17:
        return <OilingPackingForm />;
      case 18:
        return <DispatchForm />;
      default:
        return (
          <div className="flex flex-col items-center justify-center h-64">
            <h2 className="text-xl font-semibold mb-4">
              Select a manufacturing stage
            </h2>
            <p className="text-muted-foreground text-center">
              Choose a stage from the sidebar to view and manage its associated tasks
            </p>
          </div>
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar for navigation */}
      <Sidebar onStageSelect={handleStageSelect} activeStage={activeStage} />

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-6 overflow-auto">
          <Tabs 
            value={activeTab} 
            onValueChange={setActiveTab}
            className="space-y-6"
          >
            <div className="flex justify-between">
              <TabsList>
                <TabsTrigger value="overview">Dashboard</TabsTrigger>
                <TabsTrigger value="process">Process Forms</TabsTrigger>
                <TabsTrigger value="reports">Reports</TabsTrigger>
              </TabsList>
            </div>

            {/* Dashboard Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Statistics />
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                  <CardHeader>
                    <CardTitle>Production Overview</CardTitle>
                    <CardDescription>
                      Monthly production trend and completion rates
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pl-2">
                    <Overview />
                  </CardContent>
                </Card>
                <Card className="col-span-3">
                  <CardHeader>
                    <CardTitle>Stage Performance</CardTitle>
                    <CardDescription>
                      Average time spent in each manufacturing stage
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <StagePerformance />
                  </CardContent>
                </Card>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
                <Card className="col-span-1">
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>
                      Latest actions across all manufacturing stages
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RecentActivity />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Process Forms Tab */}
            <TabsContent value="process" className="space-y-6">
              {renderStageForm()}
            </TabsContent>

            {/* Reports Tab */}
            <TabsContent value="reports" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Production Reports</CardTitle>
                  <CardDescription>
                    Generate and download detailed reports
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Button variant="outline" className="w-full justify-start">
                      Daily Production Report
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      Quality Control Summary
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      Bottleneck Analysis
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      Inventory Status
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      Efficiency Metrics
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      Subcontractor Performance
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}