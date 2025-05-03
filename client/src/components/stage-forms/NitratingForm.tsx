import { useState } from "react";
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
import { Biohazard, Save, Calendar, Clock, AlertTriangle } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, formatDate } from "@/lib/utils";

const formSchema = z.object({
  partIds: z.array(z.string()).min(1, "At least one part must be selected"),
  vendorName: z.string().min(2, "Vendor name is required"),
  dateSent: z.date(),
  expectedReturn: z.date(),
  status: z.enum(["pending", "sent", "in_progress", "returned", "completed"]).default("pending"),
  processType: z.literal("nitrating"),
  processDetails: z.object({
    furnaceTemp: z.coerce.number().positive("Temperature must be positive"),
    cycleTime: z.coerce.number().positive("Cycle time must be positive"),
    atmosphere: z.string().min(1, "Atmosphere type is required"),
  }),
});

type FormData = z.infer<typeof formSchema>;

interface NitratingFormProps {
  className?: string;
}

export default function NitratingForm({ className }: NitratingFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [scannedParts, setScannedParts] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState("");
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      partIds: [],
      vendorName: "",
      dateSent: new Date(),
      expectedReturn: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // Default 5 days from now
      status: "pending",
      processType: "nitrating",
      processDetails: {
        furnaceTemp: undefined,
        cycleTime: undefined,
        atmosphere: "",
      },
    },
  });

  const createSubcontractJob = useMutation({
    mutationFn: async (data: FormData) => {
      // Transform data for API
      const payload = {
        ...data,
        partIds: JSON.stringify(data.partIds),
        processDetails: JSON.stringify(data.processDetails),
        dateSent: data.dateSent.toISOString(),
        expectedReturn: data.expectedReturn.toISOString(),
      };
      
      const response = await apiRequest("POST", "/api/subcontracted-processes", payload);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Nitrating job created",
        description: "The nitrating job has been successfully created.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/subcontracted-processes"] });
      
      // Reset form
      form.reset({
        partIds: [],
        vendorName: "",
        dateSent: new Date(),
        expectedReturn: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        status: "pending",
        processType: "nitrating",
        processDetails: {
          furnaceTemp: undefined,
          cycleTime: undefined,
          atmosphere: "",
        },
      });
      
      setScannedParts([]);
      setSelectedVendor("");
    },
    onError: (error) => {
      toast({
        title: "Error creating nitrating job",
        description: error.message || "An error occurred while creating the nitrating job.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createSubcontractJob.mutate(data);
  };

  const handleStartScanning = () => {
    setIsScanning(true);
  };

  const handlePartScan = (code: string) => {
    // Check if this part has already been scanned
    if (scannedParts.includes(code)) {
      toast({
        title: "Part already scanned",
        description: `Part ${code} has already been added to the list.`,
        variant: "warning",
      });
      return;
    }
    
    // Add to scanned parts and form value
    const updatedParts = [...scannedParts, code];
    setScannedParts(updatedParts);
    form.setValue("partIds", updatedParts);
    
    toast({
      title: "Part added",
      description: `Successfully added part: ${code}`,
    });
  };

  const handleRemovePart = (partCode: string) => {
    const updatedParts = scannedParts.filter(code => code !== partCode);
    setScannedParts(updatedParts);
    form.setValue("partIds", updatedParts);
  };

  const handleVendorChange = (value: string) => {
    setSelectedVendor(value);
    form.setValue("vendorName", value);
    
    // Set default values based on vendor (mock data)
    if (value === "advanced-heat-treat") {
      form.setValue("processDetails.furnaceTemp", 520);
      form.setValue("processDetails.cycleTime", 72);
      form.setValue("processDetails.atmosphere", "ammonia");
    } else if (value === "nitride-solutions") {
      form.setValue("processDetails.furnaceTemp", 540);
      form.setValue("processDetails.cycleTime", 48);
      form.setValue("processDetails.atmosphere", "nitrogen-hydrogen");
    } else if (value === "metal-improvement-co") {
      form.setValue("processDetails.furnaceTemp", 500);
      form.setValue("processDetails.cycleTime", 60);
      form.setValue("processDetails.atmosphere", "salt-bath");
    }
  };

  const isDateValid = () => {
    const dateSent = form.getValues("dateSent");
    const expectedReturn = form.getValues("expectedReturn");
    
    if (!dateSent || !expectedReturn) return true;
    
    return expectedReturn > dateSent;
  };

  return (
    <div id="stage-15" className={cn("form-container mb-6", className)}>
      <Card className="card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-semibold text-neutral-500 flex items-center">
            <Biohazard className="mr-2 h-5 w-5 text-primary" />
            Subcontract Job – Nitrating
          </CardTitle>
          <Badge variant="secondary" className="bg-primary-light text-white">Stage 15</Badge>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="job-details">
            <TabsList className="mb-4">
              <TabsTrigger value="job-details">Job Details</TabsTrigger>
              <TabsTrigger value="process-parameters">Process Parameters</TabsTrigger>
            </TabsList>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <TabsContent value="job-details">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div>
                      {/* Part Selection Section */}
                      <div className="mb-4">
                        <FormLabel>Multi-select Part Barcodes</FormLabel>
                        
                        {isScanning ? (
                          <div className="mb-2">
                            <BarcodeScanner
                              onScan={handlePartScan}
                              placeholder="Scan multiple parts..."
                              label=""
                            />
                            
                            <div className="mt-2 flex justify-end">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setIsScanning(false)}
                              >
                                Done Scanning
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            onClick={handleStartScanning}
                            className="w-full mb-2"
                          >
                            Start Scanning Parts
                          </Button>
                        )}
                        
                        <FormField
                          control={form.control}
                          name="partIds"
                          render={() => (
                            <FormItem>
                              <div className="border rounded-md p-3 bg-muted/30">
                                <div className="text-sm font-medium mb-2">
                                  Selected Parts: {scannedParts.length}
                                </div>
                                
                                {scannedParts.length === 0 ? (
                                  <p className="text-muted-foreground text-sm">
                                    No parts selected. Scan parts to add them to the list.
                                  </p>
                                ) : (
                                  <div className="max-h-32 overflow-y-auto space-y-1">
                                    {scannedParts.map(part => (
                                      <div key={part} className="flex items-center justify-between text-sm bg-background rounded px-2 py-1">
                                        <div className="flex items-center">
                                          <Checkbox
                                            checked={true}
                                            onCheckedChange={() => {}}
                                            className="mr-2"
                                          />
                                          <span>{part}</span>
                                        </div>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0"
                                          onClick={() => handleRemovePart(part)}
                                        >
                                          ✕
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      {/* Vendor Section */}
                      <FormField
                        control={form.control}
                        name="vendorName"
                        render={({ field }) => (
                          <FormItem className="mb-4">
                            <FormLabel>Vendor</FormLabel>
                            <Select 
                              onValueChange={handleVendorChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select vendor" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="advanced-heat-treat">Advanced Heat Treat Corp.</SelectItem>
                                <SelectItem value="nitride-solutions">Nitride Solutions Inc.</SelectItem>
                                <SelectItem value="metal-improvement-co">Metal Improvement Company</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {/* Right Column */}
                    <div>
                      {/* Date Section */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <FormField
                          control={form.control}
                          name="dateSent"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Date Sent</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      className={cn(
                                        "w-full pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                      )}
                                    >
                                      {field.value ? (
                                        formatDate(field.value)
                                      ) : (
                                        <span>Select date</span>
                                      )}
                                      <Calendar className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <CalendarComponent
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    disabled={(date) =>
                                      date < new Date("1900-01-01")
                                    }
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="expectedReturn"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Expected Return</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      className={cn(
                                        "w-full pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground",
                                        !isDateValid() && "border-destructive"
                                      )}
                                    >
                                      {field.value ? (
                                        formatDate(field.value)
                                      ) : (
                                        <span>Select date</span>
                                      )}
                                      <Calendar className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <CalendarComponent
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    disabled={(date) =>
                                      date < new Date("1900-01-01")
                                    }
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                              {!isDateValid() && (
                                <p className="text-sm font-medium text-destructive mt-1 flex items-center">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Expected return date must be after date sent
                                </p>
                              )}
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      {/* Status Section */}
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem className="mb-4">
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
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="sent">Sent</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="returned">Returned</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Vendor Information */}
                      {selectedVendor && (
                        <div className="mt-4 p-4 bg-muted rounded-lg">
                          <h4 className="font-medium text-sm mb-2">Vendor Information</h4>
                          
                          <div className="text-sm">
                            {selectedVendor === "advanced-heat-treat" && (
                              <>
                                <p><strong>Advanced Heat Treat Corp.</strong></p>
                                <p>500 Industrial Drive, Thermville</p>
                                <p>Contact: Sarah Johnson</p>
                                <p>Specializes in plasma nitriding</p>
                              </>
                            )}
                            
                            {selectedVendor === "nitride-solutions" && (
                              <>
                                <p><strong>Nitride Solutions Inc.</strong></p>
                                <p>234 Metal Way, Maplewood</p>
                                <p>Contact: Mike Chen</p>
                                <p>Specializes in gas nitriding</p>
                              </>
                            )}
                            
                            {selectedVendor === "metal-improvement-co" && (
                              <>
                                <p><strong>Metal Improvement Company</strong></p>
                                <p>788 Process Blvd, Steelton</p>
                                <p>Contact: Lisa Reynolds</p>
                                <p>Specializes in salt bath nitriding</p>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="process-parameters">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column - Process Parameters */}
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="processDetails.furnaceTemp"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Furnace Temperature (°C)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="Enter temperature" 
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
                      
                      <FormField
                        control={form.control}
                        name="processDetails.cycleTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cycle Time (hours)</FormLabel>
                            <div className="flex items-center space-x-2">
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="Enter cycle time" 
                                  {...field}
                                  onChange={(e) => {
                                    const value = e.target.value === "" ? undefined : parseFloat(e.target.value);
                                    field.onChange(value);
                                  }}
                                />
                              </FormControl>
                              <Clock className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="processDetails.atmosphere"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Atmosphere Type</FormLabel>
                            <Select 
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select atmosphere type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="ammonia">Ammonia</SelectItem>
                                <SelectItem value="nitrogen-hydrogen">Nitrogen-Hydrogen Mix</SelectItem>
                                <SelectItem value="salt-bath">Salt Bath</SelectItem>
                                <SelectItem value="plasma">Plasma</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {/* Right Column - Process Info */}
                    <div className="bg-muted rounded-lg p-4">
                      <h3 className="text-lg font-medium mb-3 text-neutral-500">Nitrating Process Information</h3>
                      
                      <div className="space-y-3">
                        <p className="text-sm">
                          Nitriding is a heat treating process that diffuses nitrogen into the surface of metal to create a case-hardened surface.
                        </p>
                        
                        <h4 className="text-sm font-medium">Benefits:</h4>
                        <ul className="list-disc pl-5 text-sm text-muted-foreground">
                          <li>Increased surface hardness</li>
                          <li>Improved wear resistance</li>
                          <li>Enhanced fatigue life</li>
                          <li>Better corrosion resistance</li>
                          <li>Low distortion compared to other hardening methods</li>
                        </ul>
                        
                        <h4 className="text-sm font-medium">Common Parameters:</h4>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                          <span className="text-muted-foreground">Temperature Range:</span>
                          <span>480-570°C</span>
                          
                          <span className="text-muted-foreground">Typical Cycle Time:</span>
                          <span>24-120 hours</span>
                          
                          <span className="text-muted-foreground">Case Depth:</span>
                          <span>0.1-0.7mm</span>
                          
                          <span className="text-muted-foreground">Hardness:</span>
                          <span>Up to 1100 HV</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                {/* Submit Buttons */}
                <div className="flex justify-end space-x-4 mt-6">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => {
                      form.reset();
                      setScannedParts([]);
                      setSelectedVendor("");
                    }}
                  >
                    Cancel
                  </Button>
                  
                  <Button 
                    type="submit"
                    disabled={
                      createSubcontractJob.isPending || 
                      scannedParts.length === 0 || 
                      !selectedVendor || 
                      !isDateValid() ||
                      !form.watch("processDetails.furnaceTemp") ||
                      !form.watch("processDetails.cycleTime") ||
                      !form.watch("processDetails.atmosphere")
                    }
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Create Nitrating Job
                  </Button>
                </div>
              </form>
            </Form>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
