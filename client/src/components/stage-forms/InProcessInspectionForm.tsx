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
import { Textarea } from "@/components/ui/textarea";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { BadgeCheck, Save, Mail } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const measurementSchema = z.object({
  name: z.string().min(1, "Measurement name is required"),
  actual: z.coerce.number().positive("Value must be positive"),
  min: z.coerce.number(),
  max: z.coerce.number(),
  unit: z.string().default("mm"),
  isValid: z.boolean().default(true),
});

const formSchema = z.object({
  fettledPartId: z.number(),
  partCode: z.string().min(3, "Part code is required"),
  inspectorName: z.string().min(2, "Inspector name is required"),
  measurements: z.array(measurementSchema).min(1, "At least one measurement is required"),
  passFail: z.enum(["accept", "reject"]),
  comments: z.string().optional(),
  sendEmailAlert: z.boolean().default(false),
});

type MeasurementData = z.infer<typeof measurementSchema>;
type FormData = z.infer<typeof formSchema>;

interface InProcessInspectionFormProps {
  className?: string;
}

export default function InProcessInspectionForm({ className }: InProcessInspectionFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [fettledPart, setFettledPart] = useState<any>(null);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  
  // Default measurements - in a real app these would be dynamic based on part type
  const defaultMeasurements = [
    { name: "Length", actual: 0, min: 145, max: 155, unit: "mm", isValid: true },
    { name: "Width", actual: 0, min: 42, max: 48, unit: "mm", isValid: true },
    { name: "Thickness", actual: 0, min: 32, max: 38, unit: "mm", isValid: true },
    { name: "Weight", actual: 0, min: 3.8, max: 4.5, unit: "kg", isValid: true },
  ];
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fettledPartId: 0,
      partCode: "",
      inspectorName: "",
      measurements: defaultMeasurements,
      passFail: "accept",
      comments: "",
      sendEmailAlert: false,
    },
  });

  const createInspection = useMutation({
    mutationFn: async (data: FormData) => {
      // In a real app, you'd format the measurements array for the API
      const { partCode, measurements, sendEmailAlert, ...requestData } = data;
      
      // Convert measurements array to JSON for API
      const measurementsJson = JSON.stringify(measurements);
      
      const response = await apiRequest("POST", "/api/in-process-inspection", {
        ...requestData,
        measurements: measurementsJson,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Inspection record saved",
        description: "The in-process inspection has been successfully recorded.",
      });
      
      if (form.getValues("sendEmailAlert") && form.getValues("passFail") === "reject") {
        toast({
          title: "Email alert sent",
          description: "Quality managers have been notified of this failed inspection.",
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/in-process-inspection"] });
      
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error saving inspection record",
        description: error.message || "An error occurred while saving the inspection record.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createInspection.mutate(data);
  };

  const resetForm = () => {
    form.reset({
      fettledPartId: 0,
      partCode: "",
      inspectorName: "",
      measurements: defaultMeasurements,
      passFail: "accept",
      comments: "",
      sendEmailAlert: false,
    });
    
    setFettledPart(null);
    setShowEmailPreview(false);
  };

  const handlePartCodeScan = (code: string) => {
    form.setValue("partCode", code);
    
    // Mock data for demonstration
    const mockFettledPart = {
      id: 1,
      partCode: code,
      visualStatus: "ok",
      notes: "",
      createdAt: new Date().toISOString(),
      trimmedPart: {
        partCode: "TRM-20230615-001",
        strokeLength: 25.5,
        offset: 2.3,
        appearance: "good",
      }
    };
    
    setFettledPart(mockFettledPart);
    form.setValue("fettledPartId", mockFettledPart.id);
    
    toast({
      title: "Part found",
      description: `Successfully scanned part: ${code}`,
    });
  };

  const handleMeasurementChange = (index: number, value: number) => {
    const measurements = [...form.getValues("measurements")];
    const measurement = measurements[index];
    
    if (!measurement) return;
    
    measurement.actual = value;
    
    // Check if the measurement is within tolerance
    measurement.isValid = value >= measurement.min && value <= measurement.max;
    
    form.setValue("measurements", measurements);
    
    // Update pass/fail based on measurements
    const allValid = measurements.every(m => m.isValid);
    form.setValue("passFail", allValid ? "accept" : "reject");
    
    // Show email preview if we're failing
    setShowEmailPreview(!allValid);
  };

  const handlePassFailChange = (value: string) => {
    form.setValue("passFail", value as "accept" | "reject");
    setShowEmailPreview(value === "reject");
  };

  return (
    <div id="stage-8" className={cn("form-container mb-6", className)}>
      <Card className="card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-semibold text-neutral-500 flex items-center">
            <BadgeCheck className="mr-2 h-5 w-5 text-primary" />
            Forging QC
          </CardTitle>
          <Badge variant="secondary" className="bg-primary-light text-white">Stage 8</Badge>
        </CardHeader>
        
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <Tabs defaultValue="inspection" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="inspection">Inspection</TabsTrigger>
                  <TabsTrigger value="results">Results</TabsTrigger>
                </TabsList>
                
                <TabsContent value="inspection">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column - Part Identification */}
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
                      
                      {/* Inspector Name */}
                      <FormField
                        control={form.control}
                        name="inspectorName"
                        render={({ field }) => (
                          <FormItem className="mb-4">
                            <FormLabel>Inspector Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter inspector name" 
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Part Information */}
                      {fettledPart && (
                        <div className="bg-muted rounded-lg p-4 mt-4">
                          <h3 className="text-lg font-medium mb-3 text-neutral-500">Part Information</h3>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Part Code:</span>
                              <span className="font-medium">{fettledPart.partCode}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Visual Status:</span>
                              <span className="font-medium capitalize">{fettledPart.visualStatus}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Trimming:</span>
                              <span className="font-medium">{fettledPart.trimmedPart.partCode}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Right Column - Measurements */}
                    <div>
                      <h3 className="text-lg font-medium mb-3 text-neutral-500">Measurements</h3>
                      
                      {form.getValues("measurements").map((measurement, index) => (
                        <div key={index} className="mb-4">
                          <div className="flex items-center mb-1">
                            <FormLabel className="flex-1">
                              {measurement.name} ({measurement.unit})
                            </FormLabel>
                            <span className="text-xs text-muted-foreground">
                              Range: {measurement.min} - {measurement.max} {measurement.unit}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Input 
                              type="number" 
                              step="0.01" 
                              placeholder={`Enter ${measurement.name.toLowerCase()}`}
                              value={measurement.actual || ""}
                              onChange={(e) => handleMeasurementChange(index, parseFloat(e.target.value))}
                              className={cn(
                                "flex-1",
                                measurement.actual && !measurement.isValid && "border-destructive"
                              )}
                            />
                            
                            {measurement.actual > 0 && (
                              <Badge variant={measurement.isValid ? "success" : "destructive"}>
                                {measurement.isValid ? "PASS" : "FAIL"}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="results">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column - Results */}
                    <div>
                      <FormField
                        control={form.control}
                        name="passFail"
                        render={({ field }) => (
                          <FormItem className="mb-4">
                            <FormLabel>Inspection Result</FormLabel>
                            <div className="flex items-center space-x-4">
                              <Button
                                type="button"
                                variant={field.value === "accept" ? "default" : "outline"}
                                className={field.value === "accept" ? "bg-success hover:bg-success/90" : ""}
                                onClick={() => handlePassFailChange("accept")}
                              >
                                Pass
                              </Button>
                              <Button
                                type="button"
                                variant={field.value === "reject" ? "default" : "outline"}
                                className={field.value === "reject" ? "bg-destructive hover:bg-destructive/90" : ""}
                                onClick={() => handlePassFailChange("reject")}
                              >
                                Fail
                              </Button>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="comments"
                        render={({ field }) => (
                          <FormItem className="mb-4">
                            <FormLabel>Comments</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Enter any comments or observations..."
                                className="h-32"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {form.watch("passFail") === "reject" && (
                        <FormField
                          control={form.control}
                          name="sendEmailAlert"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                              <div className="space-y-0.5">
                                <FormLabel>Send Email Alert</FormLabel>
                                <FormDescription>
                                  Notify quality managers of this failed inspection
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                    
                    {/* Right Column - Email Preview */}
                    <div>
                      {form.watch("passFail") === "reject" && showEmailPreview && (
                        <div className="border rounded-lg p-4">
                          <h3 className="text-lg font-medium mb-2 flex items-center">
                            <Mail className="mr-2 h-4 w-4" />
                            Email Alert Preview
                          </h3>
                          <Separator className="my-2" />
                          
                          <div className="space-y-3 text-sm">
                            <div>
                              <span className="font-medium">To:</span>
                              <span className="ml-2">quality-managers@manufacturingtech.com</span>
                            </div>
                            <div>
                              <span className="font-medium">Subject:</span>
                              <span className="ml-2">[URGENT] Inspection Failure - Part {form.watch("partCode")}</span>
                            </div>
                            <div>
                              <span className="font-medium">Body:</span>
                              <div className="mt-1 p-2 bg-muted rounded">
                                <p>A part has failed in-process inspection.</p>
                                <p className="mt-2">
                                  <strong>Part ID:</strong> {form.watch("partCode")}<br />
                                  <strong>Inspector:</strong> {form.watch("inspectorName")}<br />
                                  <strong>Date:</strong> {new Date().toLocaleString()}<br />
                                </p>
                                
                                <p className="mt-2"><strong>Failed Measurements:</strong></p>
                                <ul className="list-disc pl-5">
                                  {form.watch("measurements")
                                    .filter(m => !m.isValid && m.actual > 0)
                                    .map((m, i) => (
                                      <li key={i}>
                                        {m.name}: {m.actual} {m.unit} (Range: {m.min}-{m.max} {m.unit})
                                      </li>
                                    ))
                                  }
                                </ul>
                                
                                {form.watch("comments") && (
                                  <p className="mt-2">
                                    <strong>Comments:</strong><br />
                                    {form.watch("comments")}
                                  </p>
                                )}
                                
                                <p className="mt-2">Please review and take appropriate action.</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {form.watch("passFail") === "reject" && !showEmailPreview && (
                        <Alert className="bg-muted">
                          <AlertTitle>Inspection Failed</AlertTitle>
                          <AlertDescription>
                            Consider enabling email alerts to notify quality managers of this failure.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
              
              {/* Submit Buttons */}
              <div className="flex justify-end space-x-4 mt-6">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={resetForm}
                >
                  Cancel
                </Button>
                
                <Button 
                  type="submit"
                  disabled={createInspection.isPending || !fettledPart || !form.watch("inspectorName")}
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
