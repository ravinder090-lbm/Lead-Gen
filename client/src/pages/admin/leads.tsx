import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { LeadForm } from "@/components/leads/lead-form";
import { LeadList } from "@/components/leads/lead-list";
import { Button } from "@/components/ui/button";
import { ExportButton } from "@/components/ui/export-button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeadDetail } from "@/components/leads/lead-detail";

export default function AdminLeads() {
  const [isCreateLeadOpen, setIsCreateLeadOpen] = useState(false);
  const [isLeadDetailOpen, setIsLeadDetailOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const handleLeadDetail = (leadId: number) => {
    setSelectedLeadId(leadId);
    setIsLeadDetailOpen(false);
  };

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">
          Leads Management
        </h1>
        <div className="flex gap-2">
          {/* <ExportButton 
            endpoint="/api/export/leads" 
            label="Export Leads" 
            variant="outline"
            className="bg-white hover:bg-gray-100"
          /> */}
          <Button
            onClick={() => (window.location.href = "/admin/create-lead")}
            variant="default"
            className="bg-gradient-to-r from-blue-600 to-blue-500"
          >
            Lead Create
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Input
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full sm:w-auto"
              >
                <TabsList>
                  <TabsTrigger value="all">All Leads</TabsTrigger>
                  <TabsTrigger value="recent">Recent</TabsTrigger>
                  <TabsTrigger value="popular">Popular</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>
      </div>

      <LeadList 
        searchTerm={searchTerm}
        activeTab={activeTab}
        onSelectLead={handleLeadDetail}
      />

      {/* Create Lead Sheet */}
      <Sheet open={isCreateLeadOpen} onOpenChange={setIsCreateLeadOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Create New Lead</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <LeadForm onSuccess={() => setIsCreateLeadOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Lead Detail Sheet */}
      <Sheet open={isLeadDetailOpen} onOpenChange={setIsLeadDetailOpen}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Lead Details</SheetTitle>
          </SheetHeader>
          <div className="mt-6">{selectedLeadId && <LeadDetail />}</div>
        </SheetContent>
      </Sheet>
    </MainLayout>
  );
}
