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
import { CheckCircle, Save } from "lucide-react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const measurementSchema = z.object({
  name: z.string(),
  value: z.coerce.number().min(0, "Value must be positive"),
  unit: z.string(),
});

const formSchema = z.object({
  subcontractedProcessId: z.number(),
  processCode: z.string().min(3, "Process code is required"),
  measurements: z.array(measurementSchema).min(1, "At least one measurement is required"),
  appearance: z.enum(["excellent", "good", "acceptable", "poor", "unacceptable"]),
  passFail: z.enum(["accept", "reject"]),
  markBatchOk: z.boolean().default(false),
});

type MeasurementData = z.infer<typeof measurementSchema>;
type FormData = z.infer<typeof formSchema>;

interface PostBlastInspectionFormProps {
  className?: string;
}

export default function PostBlastInspectionForm({ className }: PostBlastInspectionFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [subcontractProcess, setSubcontractProcess] = useState<any>(null);
  
  // Default measurements
  const defaultMeasurements = [
    { name: "Surface Roughness", value: 0, unit: "Ra" },
    { name: "Coating Thickness", value: 0, unit: "μm" },
    { name: "Hardness", value: 0, unit: "HRc" },
  ];
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subcontractedProcessId: 0,
      processCode: "",
      measurements: defaultMeasurements,
      appearance: undefined,
      passFail: "accept",
      markBatchOk: false,
    },
  });

  const createInspection = useMutation({
    mutationFn: async (data: FormData) => {
      const { processCode, ...requestData } = data;
      
      // Convert measurements array to JSON for API
      const measurementsJson = JSON.stringify(data.measurements);
      
      const response = await apiRequest("POST", "/api/post-blast-inspection", {
        ...requestData,
        measurements: measurementsJson,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Post-blast inspection saved",
        description: "The post-blast inspection has been successfully recorded.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/post-blast-inspection"] });
      
      form.reset({
        subcontractedProcessId: 0,
        processCode: "",
        measurements: defaultMeasurements,
        appearance: undefined,
        passFail: "accept",
        markBatchOk: false,
      });
      
      setSubcontractProcess(null);
    },
    onError: (error) => {
      toast({
        title: "Error saving inspection",
        description: error.message || "An error occurred while saving the post-blast inspection.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createInspection.mutate(data);
  };

  const handleProcessCodeScan = (code: string) => {
    form.setValue("processCode", code);
    
    // Mock data for demonstration
    const mockProcess = {
      id: 1,
      processCode: code,
      vendor: "Blast Tech Services",
      shotSize: "S230 (Medium)",
      duration: 45,
      partIds: ["PART-20230601-001", "PART-20230601-002", "PART-20230601-003"],
      dateSent: "2023-06-01T12:00:00Z",
      status: "returned"
    };
    
    setSubcontractProcess(mockProcess);
    form.setValue("subcontractedProcessId", mockProcess.id);
    
    toast({
      title: "Process found",
      description: `Successfully scanned process: ${code}`,
    });
  };

  const handleMeasurementChange = (index: number, value: number) => {
    const measurements = [...form.getValues("measurements")];
    if (!measurements[index]) return;
    
    measurements[index].value = value;
    form.setValue("measurements", measurements);
  };

  const handleMarkBatchOkChange = (checked: boolean) => {
    form.setValue("markBatchOk", checked);
  };

  return (
    <div id="stage-11" className={cn("form-container mb-6", className)}>
      <Card className="card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-semibold text-neutral-500 flex items-center">
            <CheckCircle className="mr-2 h-5 w-5 text-primary" />
            Post-Blast QC
          </CardTitle>
          <Badge variant="secondary" className="bg-primary-light text-white">Stage 11</Badge>
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
                    name="processCode"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Process Barcode</FormLabel>
                        <FormControl>
                          <BarcodeScanner
                            onScan={handleProcessCodeScan}
                            placeholder="Scan shot-blast batch code"
                            value={field.value}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Measurements Section */}
                  <div className="mb-4">
                    <FormLabel>Measurements</FormLabel>
                    
                    <div className="space-y-3 mt-2">
                      {form.getValues("measurements").map((measurement, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <span className="text-sm w-40">{measurement.name}:</span>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder={`Enter ${measurement.name.toLowerCase()}`}
                            value={measurement.value || ""}
                            onChange={(e) => handleMeasurementChange(index, parseFloat(e.target.value))}
                            className="flex-1"
                          />
                          <span className="text-sm text-muted-foreground w-10">{measurement.unit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Appearance Section */}
                  <FormField
                    control={form.control}
                    name="appearance"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Appearance</FormLabel>
                        <Select 
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select appearance quality" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="excellent">Excellent</SelectItem>
                            <SelectItem value="good">Good</SelectItem>
                            <SelectItem value="acceptable">Acceptable</SelectItem>
                            <SelectItem value="poor">Poor</SelectItem>
                            <SelectItem value="unacceptable">Unacceptable</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Pass/Fail Section */}
                  <FormField
                    control={form.control}
                    name="passFail"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Inspection Result</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex space-x-4"
                          >
                            <div className="flex items-center">
                              <RadioGroupItem 
                                value="accept" 
                                id="result-pass" 
                                className="text-success"
                              />
                              <Label htmlFor="result-pass" className="ml-2">Pass</Label>
                            </div>
                            
                            <div className="flex items-center">
                              <RadioGroupItem 
                                value="reject" 
                                id="result-fail" 
                                className="text-destructive"
                              />
                              <Label htmlFor="result-fail" className="ml-2">Fail</Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Right Column */}
                <div>
                  {/* Process Information */}
                  {subcontractProcess ? (
                    <div className="bg-muted rounded-lg p-4 mb-4">
                      <h3 className="text-lg font-medium mb-3 text-neutral-500">Shot Blast Information</h3>
                      
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground mb-2">Process Details</h4>
                          <div className="grid grid-cols-2 gap-2">
                            <span className="text-muted-foreground">Process Code:</span>
                            <span className="font-medium">{subcontractProcess.processCode}</span>
                            
                            <span className="text-muted-foreground">Vendor:</span>
                            <span className="font-medium">{subcontractProcess.vendor}</span>
                            
                            <span className="text-muted-foreground">Shot Size:</span>
                            <span className="font-medium">{subcontractProcess.shotSize}</span>
                            
                            <span className="text-muted-foreground">Duration:</span>
                            <span className="font-medium">{subcontractProcess.duration} mins</span>
                          </div>
                        </div>
                        
                        <Separator />
                        
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground mb-2">Included Parts</h4>
                          <div className="max-h-32 overflow-y-auto">
                            <ul className="space-y-1 text-sm">
                              {subcontractProcess.partIds.map((partId: string, index: number) => (
                                <li key={index} className="bg-background rounded px-2 py-1">
                                  {partId}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-muted rounded-lg p-4 mb-4">
                      <h3 className="text-lg font-medium mb-2 text-neutral-500">Shot Blast Information</h3>
                      <p className="text-muted-foreground">Scan a process code to load details</p>
                    </div>
                  )}
                  
                  {/* Mark Batch OK Button (shown only if Pass is selected) */}
                  {form.watch("passFail") === "accept" && subcontractProcess && (
                    <div className="bg-muted rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Mark Batch Blast OK</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Confirm that the entire batch has passed inspection
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="mark-batch-ok"
                            checked={form.watch("markBatchOk")}
                            onChange={(e) => handleMarkBatchOkChange(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <label htmlFor="mark-batch-ok" className="text-sm font-medium">
                            Confirm
                          </label>
                        </div>
                      </div>
                      
                      <Button
                        type="button"
                        className="w-full mt-4"
                        disabled={!form.watch("markBatchOk")}
                        onClick={() => {
                          if (form.watch("markBatchOk")) {
                            form.handleSubmit(onSubmit)();
                          }
                        }}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Mark Batch Blast OK
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Submit Buttons */}
              <div className="flex justify-end space-x-4 mt-6">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => {
                    form.reset();
                    setSubcontractProcess(null);
                  }}
                >
                  Cancel
                </Button>
                
                <Button 
                  type="submit"
                  disabled={
                    createInspection.isPending || 
                    !subcontractProcess || 
                    !form.watch("appearance")
                  }
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Inspection
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
