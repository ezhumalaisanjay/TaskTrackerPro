import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ChevronLeft } from "lucide-react";

// Mock data for demonstrating the table view
const processData = [
  {
    id: "1",
    stage: "Raw Material Receipt",
    partCode: "RM-2023-001",
    status: "completed",
    operator: "John Smith",
    timestamp: "2023-05-10 09:30:22",
    details: {
      batchCode: "BATCH-001",
      material: "AISI 4140",
      weight: 750.5,
      quantity: 25,
    }
  },
  {
    id: "2",
    stage: "Slug Cutting",
    partCode: "SLG-2023-001",
    status: "completed",
    operator: "Maria Garcia",
    timestamp: "2023-05-12 11:45:30",
    details: {
      batchCode: "BATCH-001",
      slugCode: "SLUG-001",
      length: 120,
      weight: 30.2,
    }
  },
  {
    id: "3",
    stage: "Deburring",
    partCode: "SLG-2023-001",
    status: "completed",
    operator: "Ahmed Khan",
    timestamp: "2023-05-12 14:20:15",
    details: {
      slugCode: "SLUG-001",
      appearance: "good",
      processingTime: 25,
    }
  },
  {
    id: "4",
    stage: "Heating & Forging",
    partCode: "SLG-2023-001",
    status: "in_progress",
    operator: "Robert Lee",
    timestamp: "2023-05-12 16:05:47",
    details: {
      slugCode: "SLUG-001",
      temperature: 1200,
      pressureApplied: 350,
    }
  },
  {
    id: "5",
    stage: "Trimming",
    partCode: "SLG-2023-002",
    status: "rejected",
    operator: "Sophia Chen",
    timestamp: "2023-05-13 09:15:33",
    details: {
      slugCode: "SLUG-002",
      rejectReason: "Dimensional inaccuracy",
      comments: "Out of tolerance on diameter",
    }
  },
  {
    id: "6",
    stage: "Final QC Inspection",
    partCode: "PT-2023-014",
    status: "completed",
    operator: "James Wilson",
    timestamp: "2023-05-15 13:28:51",
    details: {
      partCode: "PT-2023-014",
      dimensionCheck: "passed",
      surfaceFinish: "excellent",
      hardnessTest: "passed",
    }
  },
  {
    id: "7",
    stage: "Oiling & Packing",
    partCode: "PT-2023-014",
    status: "completed",
    operator: "Emma Brown",
    timestamp: "2023-05-16 10:45:19",
    details: {
      partCode: "PT-2023-014",
      oilBatch: "OIL-B2023",
      packingMaterial: "VCI paper and cardboard box",
    }
  },
  {
    id: "8",
    stage: "Dispatch",
    partCode: "PT-2023-014",
    status: "pending",
    operator: "Daniel Martinez",
    timestamp: "2023-05-17 14:30:00",
    details: {
      partCode: "PT-2023-014",
      carrier: "Express Logistics",
      trackingNumber: "EL-789456-XYZ",
    }
  },
];

export default function ProcessDataTable() {
  const [filter, setFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [filteredData, setFilteredData] = useState(processData);

  // Apply filters whenever filter values change
  useEffect(() => {
    let result = processData;
    
    // Apply text search filter
    if (filter) {
      const lowerFilter = filter.toLowerCase();
      result = result.filter(item => 
        item.partCode.toLowerCase().includes(lowerFilter) ||
        item.operator.toLowerCase().includes(lowerFilter) ||
        item.stage.toLowerCase().includes(lowerFilter)
      );
    }
    
    // Apply stage filter
    if (stageFilter !== "all") {
      result = result.filter(item => item.stage === stageFilter);
    }
    
    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter(item => item.status === statusFilter);
    }
    
    setFilteredData(result);
  }, [filter, stageFilter, statusFilter]);

  // Get unique stages for filter dropdown
  const uniqueStages = ["all", ...Array.from(new Set(processData.map(item => item.stage)))];
  
  // Function to get the status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/10 text-green-500 hover:bg-green-500/20";
      case "in_progress":
        return "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20";
      case "pending":
        return "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20";
      case "rejected":
        return "bg-red-500/10 text-red-500 hover:bg-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20";
    }
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex items-center mb-8">
        <Link href="/">
          <Button variant="outline" size="sm" className="mr-4">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Manufacturing Process Data</h1>
      </div>
      
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle>Process Data Table</CardTitle>
          <CardDescription>
            View and filter all manufacturing process data across stages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by part code, operator, or stage..."
                className="pl-8"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
            
            <Select 
              value={stageFilter} 
              onValueChange={(value) => setStageFilter(value)}
            >
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {uniqueStages.filter(stage => stage !== "all").map(stage => (
                  <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select 
              value={statusFilter} 
              onValueChange={(value) => setStatusFilter(value)}
            >
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stage</TableHead>
                  <TableHead>Part Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Operator</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length > 0 ? (
                  filteredData.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.stage}</TableCell>
                      <TableCell>{row.partCode}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={getStatusColor(row.status)}
                        >
                          {row.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>{row.operator}</TableCell>
                      <TableCell>{row.timestamp}</TableCell>
                      <TableCell>
                        <div className="text-xs text-muted-foreground">
                          {Object.entries(row.details).map(([key, value]) => (
                            <div key={key}>
                              <span className="font-medium">{key}: </span>
                              {value}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No results found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          <div className="mt-3 text-sm text-muted-foreground">
            Showing {filteredData.length} of {processData.length} records
          </div>
        </CardContent>
      </Card>
    </div>
  );
}