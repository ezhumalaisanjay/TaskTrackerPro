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
import { Wheat, Save, Calendar, Clock, AlertTriangle } from "lucide-react";
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
import { cn, formatDate, isOverdue } from "@/lib/utils";

const formSchema = z.object({
  partIds: z.array(z.string()).min(1, "At least one part must be selected"),
  vendorName: z.string().min(2, "Vendor name is required"),
  dateSent: z.date(),
  expectedReturn: z.date(),
  status: z.enum(["pending", "sent", "in_progress", "returned", "completed"]).default("pending"),
  processType: z.literal("shot_blast"),
  processDetails: z.object({
    shotSize: z.string().min(1, "Shot size is required"),
    duration: z.coerce.number().positive("Duration must be positive"),
  }),
});

type FormData = z.infer<typeof formSchema>;

interface ShotBlastingFormProps {
  className?: string;
}

export default function ShotBlastingForm({ className }: ShotBlastingFormProps) {
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
      expectedReturn: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // Default 3 days from now
      status: "pending",
      processType: "shot_blast",
      processDetails: {
        shotSize: "",
        duration: undefined,
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
        title: "Subcontract job created",
        description: "The shot blasting job has been successfully created.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/subcontracted-processes"] });
      
      // Reset form
      form.reset({
        partIds: [],
        vendorName: "",
        dateSent: new Date(),
        expectedReturn: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        status: "pending",
        processType: "shot_blast",
        processDetails: {
          shotSize: "",
          duration: undefined,
        },
      });
      
      setScannedParts([]);
      setSelectedVendor("");
    },
    onError: (error) => {
      toast({
        title: "Error creating subcontract job",
        description: error.message || "An error occurred while creating the subcontract job.",
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
    if (value === "blast-tech-services") {
      form.setValue("processDetails.shotSize", "s230");
      form.setValue("processDetails.duration", 45);
    } else if (value === "surface-finish-specialists") {
      form.setValue("processDetails.shotSize", "s170");
      form.setValue("processDetails.duration", 35);
    } else if (value === "industrial-blasting-co") {
      form.setValue("processDetails.shotSize", "s280");
      form.setValue("processDetails.duration", 60);
    }
  };

  const isDateValid = () => {
    const dateSent = form.getValues("dateSent");
    const expectedReturn = form.getValues("expectedReturn");
    
    if (!dateSent || !expectedReturn) return true;
    
    return expectedReturn > dateSent;
  };

  // Mock data for current jobs
  const currentJobs = [
    {
      id: 1,
      vendor: "Blast Tech Services",
      parts: 12,
      sent: "2023-06-01",
      expected: "2023-06-04",
      status: "overdue"
    },
    {
      id: 2,
      vendor: "Surface Finish Specialists",
      parts: 8,
      sent: "2023-06-03",
      expected: "2023-06-07",
      status: "in_progress"
    }
  ];

  return (
    <div id="stage-10" className={cn("form-container mb-6", className)}>
      <Card className="card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-semibold text-neutral-500 flex items-center">
            <Wheat className="mr-2 h-5 w-5 text-primary" />
            Subcontract Job – Shot Blast
          </CardTitle>
          <Badge variant="secondary" className="bg-primary-light text-white">Stage 10</Badge>
        </CardHeader>
        
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
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
                            <SelectItem value="blast-tech-services">Blast Tech Services</SelectItem>
                            <SelectItem value="surface-finish-specialists">Surface Finish Specialists</SelectItem>
                            <SelectItem value="industrial-blasting-co">Industrial Blasting Co.</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
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
                </div>
                
                {/* Right Column - Process Details */}
                <div>
                  <h3 className="text-lg font-medium mb-3 text-neutral-500">Shot Blasting Details</h3>
                  
                  <FormField
                    control={form.control}
                    name="processDetails.shotSize"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Shot Size</FormLabel>
                        <Select 
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select shot size" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="s110">S110 (Fine)</SelectItem>
                            <SelectItem value="s170">S170 (Medium-Fine)</SelectItem>
                            <SelectItem value="s230">S230 (Medium)</SelectItem>
                            <SelectItem value="s280">S280 (Medium-Coarse)</SelectItem>
                            <SelectItem value="s330">S330 (Coarse)</SelectItem>
                            <SelectItem value="s390">S390 (Extra Coarse)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="processDetails.duration"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Duration (mins)</FormLabel>
                        <div className="flex items-center space-x-2">
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="Enter duration" 
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
                  
                  {/* Current Jobs */}
                  <div className="mt-6">
                    <h4 className="font-medium text-sm mb-2">Current Shot Blasting Jobs</h4>
                    
                    <div className="border rounded-md overflow-hidden">
                      <table className="min-w-full divide-y divide-border">
                        <thead className="bg-muted">
                          <tr>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                              Vendor
                            </th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                              Parts
                            </th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                              Expected
                            </th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {currentJobs.map((job) => (
                            <tr key={job.id}>
                              <td className="px-3 py-2 text-xs">
                                {job.vendor}
                              </td>
                              <td className="px-3 py-2 text-xs">
                                {job.parts}
                              </td>
                              <td className="px-3 py-2 text-xs">
                                {formatDate(job.expected)}
                              </td>
                              <td className="px-3 py-2 text-xs">
                                {job.status === "overdue" ? (
                                  <Badge variant="destructive" className="text-xs">Overdue</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs">{job.status}</Badge>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
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
                    !isDateValid()
                  }
                >
                  <Save className="mr-2 h-4 w-4" />
                  Create Job
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
