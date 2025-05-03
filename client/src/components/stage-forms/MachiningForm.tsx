import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { PackageSearch, Save } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

const formSchema = z.object({
  partId: z.number(),
  partCode: z.string().min(3, "Part code is required"),
  stage: z.coerce.number().int().min(1).max(3),
  machineName: z.string().min(1, "Machine name is required"),
  operatorName: z.string().min(1, "Operator name is required"),
  speed: z.coerce.number().int().positive("Speed must be a positive integer"),
  feed: z.coerce.number().positive("Feed must be positive"),
  scrapQuantity: z.coerce.number().int().nonnegative("Scrap quantity must be non-negative"),
  status: z.enum(["pending", "in_progress", "completed", "hold"]).default("completed"),
});

type FormData = z.infer<typeof formSchema>;

interface MachiningFormProps {
  className?: string;
  stage?: number;
}

export default function MachiningForm({ className, stage = 1 }: MachiningFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [part, setPart] = useState<any>(null);
  const [location] = useLocation();
  const [activeStage, setActiveStage] = useState(stage);
  
  useEffect(() => {
    // Extract stage from location hash
    const match = location.match(/#stage-(\d+)/);
    if (match && match[1]) {
      const stageFromUrl = parseInt(match[1]);
      if (stageFromUrl >= 12 && stageFromUrl <= 14) {
        setActiveStage(stageFromUrl - 11); // Map stage 12-14 to 1-3
      }
    }
  }, [location]);
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      partId: 0,
      partCode: "",
      stage: activeStage,
      machineName: "",
      operatorName: "",
      speed: undefined,
      feed: undefined,
      scrapQuantity: 0,
      status: "completed",
    },
  });
  
  // Update form when active stage changes
  useEffect(() => {
    form.setValue("stage", activeStage);
  }, [activeStage, form]);

  const machineOptions = [
    { value: "cnc-mill-1", label: "CNC Mill 1" },
    { value: "cnc-mill-2", label: "CNC Mill 2" },
    { value: "cnc-lathe-1", label: "CNC Lathe 1" },
    { value: "cnc-lathe-2", label: "CNC Lathe 2" },
    { value: "drill-press-1", label: "Drill Press 1" },
    { value: "grinder-1", label: "Surface Grinder 1" },
  ];

  const createMachining = useMutation({
    mutationFn: async (data: FormData) => {
      const { partCode, ...requestData } = data;
      const response = await apiRequest("POST", "/api/machining", requestData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Machining operation saved",
        description: `Machining stage ${activeStage} has been successfully recorded.`,
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/machining"] });
      
      form.reset({
        partId: 0,
        partCode: "",
        stage: activeStage,
        machineName: "",
        operatorName: "",
        speed: undefined,
        feed: undefined,
        scrapQuantity: 0,
        status: "completed",
      });
      
      setPart(null);
    },
    onError: (error) => {
      toast({
        title: "Error saving machining operation",
        description: error.message || "An error occurred while saving the machining operation.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createMachining.mutate(data);
  };

  const handlePartCodeScan = (code: string) => {
    form.setValue("partCode", code);
    
    // Mock data for demonstration
    const mockPart = {
      id: 1,
      partCode: code,
      type: "Forged Component",
      material: "Steel Alloy 4140",
      dimensions: {
        length: 150,
        width: 75,
        height: 30
      },
      processHistory: {
        forging: true,
        heatTreat: true,
        shotBlast: true
      }
    };
    
    setPart(mockPart);
    form.setValue("partId", mockPart.id);
    
    toast({
      title: "Part found",
      description: `Successfully scanned part: ${code}`,
    });
  };

  const stageTitle = () => {
    switch(activeStage) {
      case 1: return "Machining I";
      case 2: return "Machining II";
      case 3: return "Machining III";
      default: return "Machining";
    }
  };

  const stageNumber = () => {
    return 11 + activeStage; // Maps 1,2,3 to stages 12,13,14
  };

  return (
    <div id={`stage-${stageNumber()}`} className={cn("form-container mb-6", className)}>
      <Card className="card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-semibold text-neutral-500 flex items-center">
            <PackageSearch className="mr-2 h-5 w-5 text-primary" />
            {stageTitle()}
          </CardTitle>
          <Badge variant="secondary" className="bg-primary-light text-white">Stage {stageNumber()}</Badge>
        </CardHeader>
        
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div>
                  {/* Barcode Scanner Section */}
                  <FormField
                    control={form.control}
                    name="partCode"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Part Barcode</FormLabel>
                        <FormControl>
                          <BarcodeScanner
                            onScan={handlePartCodeScan}
                            placeholder="Scan or enter part code"
                            value={field.value}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Machine & Operator Section */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <FormField
                      control={form.control}
                      name="machineName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Machine</FormLabel>
                          <Select 
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select machine" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {machineOptions.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="operatorName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Operator</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter operator name" 
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Cutting Parameters */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <FormField
                      control={form.control}
                      name="speed"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Speed (RPM)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="0" 
                              {...field}
                              onChange={(e) => {
                                const value = e.target.value === "" ? undefined : parseInt(e.target.value);
                                field.onChange(value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="feed"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Feed (mm/min)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              placeholder="0.00" 
                              {...field}
                              onChange={(e) => {
                                const value = e.target.value === "" ? undefined : parseFloat(e.target.value);
                                field.onChange(value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Scrap & Status */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <FormField
                      control={form.control}
                      name="scrapQuantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Scrap Quantity</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="0" 
                              {...field}
                              onChange={(e) => {
                                const value = e.target.value === "" ? 0 : parseInt(e.target.value);
                                field.onChange(value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select 
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="completed">Complete</SelectItem>
                              <SelectItem value="hold">Hold</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                {/* Right Column - Part Information */}
                <div>
                  <div className="bg-muted rounded-lg p-4">
                    <h3 className="text-lg font-medium mb-3 text-neutral-500">Part Information</h3>
                    
                    {part ? (
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground mb-2">General Information</h4>
                          <div className="grid grid-cols-2 gap-2">
                            <span className="text-muted-foreground">Part Code:</span>
                            <span className="font-medium">{part.partCode}</span>
                            
                            <span className="text-muted-foreground">Type:</span>
                            <span className="font-medium">{part.type}</span>
                            
                            <span className="text-muted-foreground">Material:</span>
                            <span className="font-medium">{part.material}</span>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground mb-2">Dimensions</h4>
                          <div className="grid grid-cols-2 gap-2">
                            <span className="text-muted-foreground">Length:</span>
                            <span className="font-medium">{part.dimensions.length} mm</span>
                            
                            <span className="text-muted-foreground">Width:</span>
                            <span className="font-medium">{part.dimensions.width} mm</span>
                            
                            <span className="text-muted-foreground">Height:</span>
                            <span className="font-medium">{part.dimensions.height} mm</span>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground mb-2">Process Status</h4>
                          <div className="grid grid-cols-2 gap-2">
                            <span className="text-muted-foreground">Forging:</span>
                            <span className="font-medium">{part.processHistory.forging ? "Completed" : "Not Started"}</span>
                            
                            <span className="text-muted-foreground">Heat Treatment:</span>
                            <span className="font-medium">{part.processHistory.heatTreat ? "Completed" : "Not Started"}</span>
                            
                            <span className="text-muted-foreground">Shot Blasting:</span>
                            <span className="font-medium">{part.processHistory.shotBlast ? "Completed" : "Not Started"}</span>
                            
                            <span className="text-muted-foreground">Machining Stage:</span>
                            <span className="font-medium">{activeStage}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Scan a part to view details</p>
                    )}
                  </div>
                  
                  {/* Stage Description */}
                  <div className="mt-4 bg-muted rounded-lg p-4">
                    <h4 className="font-medium mb-2">Machining Stage {activeStage} Description</h4>
                    <p className="text-sm text-muted-foreground">
                      {activeStage === 1 && "Initial machining to establish primary dimensions and features."}
                      {activeStage === 2 && "Secondary machining for precise features and critical dimensions."}
                      {activeStage === 3 && "Final machining for finishing surfaces and detail features."}
                    </p>
                    
                    {/* Operations specific to this stage */}
                    <div className="mt-3">
                      <h5 className="text-sm font-medium">Operations:</h5>
                      <ul className="list-disc pl-5 text-sm text-muted-foreground mt-1">
                        {activeStage === 1 && (
                          <>
                            <li>Rough turning of external diameters</li>
                            <li>Face milling of primary surfaces</li>
                            <li>Drilling of primary holes</li>
                          </>
                        )}
                        {activeStage === 2 && (
                          <>
                            <li>Semi-finish turning</li>
                            <li>Precision boring of critical features</li>
                            <li>Chamfering of edges</li>
                          </>
                        )}
                        {activeStage === 3 && (
                          <>
                            <li>Finish turning to final dimensions</li>
                            <li>Threading operations</li>
                            <li>Final surface finishing</li>
                          </>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Submit Buttons */}
              <div className="flex justify-end space-x-4 mt-6">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => {
                    form.reset({
                      partId: 0,
                      partCode: "",
                      stage: activeStage,
                      machineName: "",
                      operatorName: "",
                      speed: undefined,
                      feed: undefined,
                      scrapQuantity: 0,
                      status: "completed",
                    });
                    setPart(null);
                  }}
                >
                  Cancel
                </Button>
                
                <Button 
                  type="submit"
                  disabled={
                    createMachining.isPending || 
                    !part || 
                    !form.watch("machineName") || 
                    !form.watch("operatorName")
                  }
                >
                  <Save className="mr-2 h-4 w-4" />
                  Complete Operation
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
