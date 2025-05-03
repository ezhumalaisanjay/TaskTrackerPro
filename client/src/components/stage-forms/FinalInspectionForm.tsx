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
import { SquareCheck, Save, Package, ArrowRight } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const dimensionCheckSchema = z.object({
  name: z.string(),
  nominal: z.coerce.number().min(0, "Value must be positive"),
  actual: z.coerce.number().min(0, "Value must be positive"),
  tolerance: z.coerce.number().min(0, "Value must be positive"),
  unit: z.string(),
  isValid: z.boolean().default(true),
});

const formSchema = z.object({
  partId: z.number(),
  partCode: z.string().min(3, "Part code is required"),
  dimensionChecks: z.array(dimensionCheckSchema).min(1, "At least one dimension check is required"),
  passFail: z.enum(["accept", "reject"]),
  comments: z.string().optional(),
  moveToWarehouse: z.boolean().default(false),
  sendToRework: z.boolean().default(false),
});

type DimensionCheckData = z.infer<typeof dimensionCheckSchema>;
type FormData = z.infer<typeof formSchema>;

interface FinalInspectionFormProps {
  className?: string;
}

export default function FinalInspectionForm({ className }: FinalInspectionFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [part, setPart] = useState<any>(null);
  const [showActionDialog, setShowActionDialog] = useState(false);
  
  // Default dimension checks
  const defaultDimensionChecks = [
    { name: "Overall Length", nominal: 150.0, actual: 0, tolerance: 0.2, unit: "mm", isValid: true },
    { name: "Diameter A", nominal: 35.5, actual: 0, tolerance: 0.1, unit: "mm", isValid: true },
    { name: "Diameter B", nominal: 25.2, actual: 0, tolerance: 0.1, unit: "mm", isValid: true },
    { name: "Hole Diameter", nominal: 12.0, actual: 0, tolerance: 0.05, unit: "mm", isValid: true },
    { name: "Surface Roughness", nominal: 1.6, actual: 0, tolerance: 0.4, unit: "Ra", isValid: true },
  ];
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      partId: 0,
      partCode: "",
      dimensionChecks: defaultDimensionChecks,
      passFail: "accept",
      comments: "",
      moveToWarehouse: false,
      sendToRework: false,
    },
  });

  const createFinalInspection = useMutation({
    mutationFn: async (data: FormData) => {
      const { partCode, dimensionChecks, ...requestData } = data;
      
      // Convert dimension checks array to JSON for API
      const dimensionChecksJson = JSON.stringify(dimensionChecks);
      
      const response = await apiRequest("POST", "/api/final-inspection", {
        ...requestData,
        dimensionChecks: dimensionChecksJson,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Final inspection saved",
        description: "The final inspection has been successfully recorded.",
      });
      
      if (form.getValues("moveToWarehouse")) {
        toast({
          title: "Part routed to warehouse",
          description: "The part has been moved to finished goods warehouse.",
          variant: "success",
        });
      } else if (form.getValues("sendToRework")) {
        toast({
          title: "Part sent to rework",
          description: "The part has been sent for rework.",
          variant: "warning",
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/final-inspection"] });
      
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error saving final inspection",
        description: error.message || "An error occurred while saving the final inspection.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    // If no action has been selected, show the action dialog
    if (data.passFail === "accept" && !data.moveToWarehouse) {
      setShowActionDialog(true);
      return;
    } else if (data.passFail === "reject" && !data.sendToRework) {
      setShowActionDialog(true);
      return;
    }
    
    createFinalInspection.mutate(data);
  };

  const resetForm = () => {
    form.reset({
      partId: 0,
      partCode: "",
      dimensionChecks: defaultDimensionChecks,
      passFail: "accept",
      comments: "",
      moveToWarehouse: false,
      sendToRework: false,
    });
    
    setPart(null);
    setShowActionDialog(false);
  };

  const handlePartCodeScan = (code: string) => {
    form.setValue("partCode", code);
    
    // Mock data for demonstration
    const mockPart = {
      id: 1,
      partCode: code,
      description: "Machined Steel Component",
      material: "AISI 4140",
      machiningComplete: true,
      nitratingComplete: true,
      expectedDimensions: {
        length: 150.0,
        diameterA: 35.5,
        diameterB: 25.2,
        holeDiameter: 12.0,
        surfaceRoughness: 1.6
      }
    };
    
    setPart(mockPart);
    form.setValue("partId", mockPart.id);
    
    toast({
      title: "Part found",
      description: `Successfully scanned part: ${code}`,
    });
  };

  const handleDimensionChange = (index: number, value: number) => {
    const dimensionChecks = [...form.getValues("dimensionChecks")];
    if (!dimensionChecks[index]) return;
    
    const check = dimensionChecks[index];
    check.actual = value;
    
    // Check if the dimension is within tolerance
    const lowerLimit = check.nominal - check.tolerance;
    const upperLimit = check.nominal + check.tolerance;
    check.isValid = value >= lowerLimit && value <= upperLimit;
    
    form.setValue("dimensionChecks", dimensionChecks);
    
    // Update pass/fail based on all dimension checks
    const allValid = dimensionChecks.every(check => check.isValid);
    form.setValue("passFail", allValid ? "accept" : "reject");
  };

  const handleMoveToWarehouseAction = () => {
    form.setValue("moveToWarehouse", true);
    form.setValue("sendToRework", false);
    setShowActionDialog(false);
    form.handleSubmit(onSubmit)();
  };

  const handleSendToReworkAction = () => {
    form.setValue("moveToWarehouse", false);
    form.setValue("sendToRework", true);
    setShowActionDialog(false);
    form.handleSubmit(onSubmit)();
  };

  return (
    <div id="stage-16" className={cn("form-container mb-6", className)}>
      <Card className="card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-semibold text-neutral-500 flex items-center">
            <SquareCheck className="mr-2 h-5 w-5 text-primary" />
            Final QC Inspection
          </CardTitle>
          <Badge variant="secondary" className="bg-primary-light text-white">Stage 16</Badge>
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
                  
                  {/* Dimension Checks Section */}
                  <div className="mb-4">
                    <FormLabel>Dimension Checks</FormLabel>
                    
                    <div className="space-y-3 mt-2">
                      <div className="grid grid-cols-7 gap-2 text-xs font-medium text-muted-foreground">
                        <div className="col-span-2">Dimension</div>
                        <div>Nominal</div>
                        <div>Tolerance</div>
                        <div>Actual</div>
                        <div>Unit</div>
                        <div>Status</div>
                      </div>
                      
                      {form.getValues("dimensionChecks").map((check, index) => (
                        <div key={index} className="grid grid-cols-7 gap-2 items-center">
                          <div className="col-span-2 text-sm">{check.name}</div>
                          <div>{check.nominal}</div>
                          <div>±{check.tolerance}</div>
                          <div>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={check.actual || ""}
                              onChange={(e) => handleDimensionChange(index, parseFloat(e.target.value))}
                              className={cn(
                                "h-8 text-sm",
                                check.actual && !check.isValid && "border-destructive"
                              )}
                            />
                          </div>
                          <div>{check.unit}</div>
                          <div>
                            {check.actual > 0 && (
                              <Badge variant={check.isValid ? "success" : "destructive"} className="text-xs">
                                {check.isValid ? "OK" : "NOT OK"}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
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
                            value={field.value}
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
                  
                  {/* Comments Section */}
                  <FormField
                    control={form.control}
                    name="comments"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Comments</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter any comments or observations..."
                            className="h-24"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Right Column */}
                <div>
                  {/* Part Information */}
                  {part ? (
                    <div className="bg-muted rounded-lg p-4 mb-4">
                      <h3 className="text-lg font-medium mb-3 text-neutral-500">Part Information</h3>
                      
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground mb-2">General Information</h4>
                          <div className="grid grid-cols-2 gap-2">
                            <span className="text-muted-foreground">Part Code:</span>
                            <span className="font-medium">{part.partCode}</span>
                            
                            <span className="text-muted-foreground">Description:</span>
                            <span className="font-medium">{part.description}</span>
                            
                            <span className="text-muted-foreground">Material:</span>
                            <span className="font-medium">{part.material}</span>
                          </div>
                        </div>
                        
                        <Separator />
                        
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground mb-2">Process Status</h4>
                          <div className="grid grid-cols-2 gap-2">
                            <span className="text-muted-foreground">Machining:</span>
                            <span className="font-medium">{part.machiningComplete ? "Completed" : "Incomplete"}</span>
                            
                            <span className="text-muted-foreground">Nitrating:</span>
                            <span className="font-medium">{part.nitratingComplete ? "Completed" : "Incomplete"}</span>
                          </div>
                        </div>
                        
                        <Separator />
                        
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground mb-2">Expected Dimensions</h4>
                          <div className="grid grid-cols-2 gap-2">
                            <span className="text-muted-foreground">Overall Length:</span>
                            <span className="font-medium">{part.expectedDimensions.length} mm</span>
                            
                            <span className="text-muted-foreground">Diameter A:</span>
                            <span className="font-medium">{part.expectedDimensions.diameterA} mm</span>
                            
                            <span className="text-muted-foreground">Diameter B:</span>
                            <span className="font-medium">{part.expectedDimensions.diameterB} mm</span>
                            
                            <span className="text-muted-foreground">Hole Diameter:</span>
                            <span className="font-medium">{part.expectedDimensions.holeDiameter} mm</span>
                            
                            <span className="text-muted-foreground">Surface Roughness:</span>
                            <span className="font-medium">{part.expectedDimensions.surfaceRoughness} Ra</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-muted rounded-lg p-4 mb-4">
                      <h3 className="text-lg font-medium mb-2 text-neutral-500">Part Information</h3>
                      <p className="text-muted-foreground">Scan a part to view details</p>
                    </div>
                  )}
                  
                  {/* Action Buttons based on Pass/Fail */}
                  {part && (
                    <div className="bg-muted rounded-lg p-4">
                      <h3 className="text-lg font-medium mb-3 text-neutral-500">Action Required</h3>
                      
                      {form.watch("passFail") === "accept" ? (
                        <div>
                          <p className="text-sm text-muted-foreground mb-4">
                            This part has passed final inspection and is ready to be moved to the
                            finished goods warehouse.
                          </p>
                          
                          <Button
                            type="button"
                            variant="success"
                            className="w-full"
                            onClick={handleMoveToWarehouseAction}
                          >
                            <Package className="mr-2 h-4 w-4" />
                            Move to FG Warehouse
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm text-muted-foreground mb-4">
                            This part has failed final inspection and needs to be routed for rework
                            or further analysis.
                          </p>
                          
                          <Button
                            type="button"
                            variant="destructive"
                            className="w-full"
                            onClick={handleSendToReworkAction}
                          >
                            <ArrowRight className="mr-2 h-4 w-4" />
                            Send to Rework
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
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
                  disabled={
                    createFinalInspection.isPending || 
                    !part || 
                    form.getValues("dimensionChecks").some(check => !check.actual)
                  }
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Inspection
                </Button>
              </div>
            </form>
          </Form>
          
          {/* Action Dialog */}
          <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Action Required</DialogTitle>
                <DialogDescription>
                  {form.watch("passFail") === "accept"
                    ? "This part has passed final inspection. What would you like to do with it?"
                    : "This part has failed final inspection. What would you like to do with it?"}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 pt-4">
                {form.watch("passFail") === "accept" ? (
                  <Button
                    className="w-full"
                    onClick={handleMoveToWarehouseAction}
                  >
                    <Package className="mr-2 h-4 w-4" />
                    Move to Finished Goods Warehouse
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={handleSendToReworkAction}
                  >
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Send to Rework
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowActionDialog(false)}
                >
                  Cancel
                </Button>
              </div>
              
              <DialogFooter className="text-xs text-muted-foreground">
                This action will be recorded in the part history.
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
