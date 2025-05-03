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
import { Textarea } from "@/components/ui/textarea";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { Combine, Save } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  trimmedPartId: z.number(),
  partCode: z.string().min(3, "Part code is required"),
  visualStatus: z.enum(["ok", "defect"]),
  notes: z.string().optional(),
  routeToRework: z.boolean().default(false),
});

type FormData = z.infer<typeof formSchema>;

interface FettlingFormProps {
  className?: string;
}

export default function FettlingForm({ className }: FettlingFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [trimmedPart, setTrimmedPart] = useState<any>(null);
  const [showReworkDialog, setShowReworkDialog] = useState(false);
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      trimmedPartId: 0,
      partCode: "",
      visualStatus: "ok",
      notes: "",
      routeToRework: false,
    },
  });

  const createFettling = useMutation({
    mutationFn: async (data: FormData) => {
      const { partCode, ...requestData } = data;
      const response = await apiRequest("POST", "/api/fettling", requestData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Fettling record saved",
        description: "The fettling operation has been successfully recorded.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/fettling"] });
      
      form.reset({
        trimmedPartId: 0,
        partCode: "",
        visualStatus: "ok",
        notes: "",
        routeToRework: false,
      });
      
      setTrimmedPart(null);
      setShowReworkDialog(false);
    },
    onError: (error) => {
      toast({
        title: "Error saving fettling record",
        description: error.message || "An error occurred while saving the fettling record.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    // If status is defect, show the rework dialog
    if (data.visualStatus === "defect" && !data.routeToRework) {
      setShowReworkDialog(true);
      return;
    }
    
    createFettling.mutate(data);
  };

  const handlePartCodeScan = (code: string) => {
    form.setValue("partCode", code);
    
    // Mock data for demonstration
    const mockTrimmedPart = {
      id: 1,
      partCode: code,
      strokeLength: 25.5,
      offset: 2.3,
      appearance: "good",
      createdAt: new Date().toISOString(),
      forgedPart: {
        partCode: "FRG-20230615-001",
        dimensions: {
          height: 120.5,
          width: 45.2,
          depth: 35.8
        }
      }
    };
    
    setTrimmedPart(mockTrimmedPart);
    form.setValue("trimmedPartId", mockTrimmedPart.id);
    
    toast({
      title: "Part found",
      description: `Successfully scanned part: ${code}`,
    });
  };

  const handleVisualStatusChange = (value: string) => {
    const isDefect = value === "defect";
    form.setValue("visualStatus", isDefect ? "defect" : "ok");
    
    if (!isDefect) {
      form.setValue("notes", "");
      form.setValue("routeToRework", false);
    }
  };

  const handleReworkDialogConfirm = () => {
    form.setValue("routeToRework", true);
    createFettling.mutate(form.getValues());
    setShowReworkDialog(false);
  };

  const handleReworkDialogCancel = () => {
    setShowReworkDialog(false);
  };

  return (
    <div id="stage-7" className={cn("form-container mb-6", className)}>
      <Card className="card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-semibold text-neutral-500 flex items-center">
            <Combine className="mr-2 h-5 w-5 text-primary" />
            Fettling
          </CardTitle>
          <Badge variant="secondary" className="bg-primary-light text-white">Stage 7</Badge>
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
                  
                  {/* Visual Status Section */}
                  <FormField
                    control={form.control}
                    name="visualStatus"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Visual Status</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={(value) => {
                              field.onChange(value);
                              handleVisualStatusChange(value);
                            }}
                            defaultValue={field.value}
                            className="flex space-x-4"
                          >
                            <div className="flex items-center">
                              <RadioGroupItem 
                                value="ok" 
                                id="status-ok" 
                                className="text-success"
                              />
                              <Label htmlFor="status-ok" className="ml-2">OK</Label>
                            </div>
                            
                            <div className="flex items-center">
                              <RadioGroupItem 
                                value="defect" 
                                id="status-defect" 
                                className="text-destructive"
                              />
                              <Label htmlFor="status-defect" className="ml-2">Defect</Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Notes Field */}
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter any notes or observations..."
                            className="h-32"
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
                  <div className="bg-muted rounded-lg p-4">
                    <h3 className="text-lg font-medium mb-3 text-neutral-500">Part Information</h3>
                    
                    {trimmedPart ? (
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground mb-2">Trimmed Part Details</h4>
                          <div className="grid grid-cols-2 gap-2">
                            <span className="text-muted-foreground">Part Code:</span>
                            <span className="font-medium">{trimmedPart.partCode}</span>
                            
                            <span className="text-muted-foreground">Stroke Length:</span>
                            <span className="font-medium">{trimmedPart.strokeLength} mm</span>
                            
                            <span className="text-muted-foreground">Offset:</span>
                            <span className="font-medium">{trimmedPart.offset} mm</span>
                            
                            <span className="text-muted-foreground">Appearance:</span>
                            <span className="font-medium capitalize">{trimmedPart.appearance}</span>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground mb-2">Forged Part Dimensions</h4>
                          <div className="grid grid-cols-2 gap-2">
                            <span className="text-muted-foreground">Height:</span>
                            <span className="font-medium">{trimmedPart.forgedPart.dimensions.height} mm</span>
                            
                            <span className="text-muted-foreground">Width:</span>
                            <span className="font-medium">{trimmedPart.forgedPart.dimensions.width} mm</span>
                            
                            <span className="text-muted-foreground">Depth:</span>
                            <span className="font-medium">{trimmedPart.forgedPart.dimensions.depth} mm</span>
                          </div>
                        </div>
                      </div>
                    ) : form.watch('partCode') ? (
                      <p className="text-destructive">Part not found</p>
                    ) : (
                      <p className="text-muted-foreground">Scan a part to view details</p>
                    )}
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
                    setTrimmedPart(null);
                  }}
                >
                  Cancel
                </Button>
                
                <Button 
                  type="submit"
                  disabled={createFettling.isPending || !trimmedPart}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Complete Fettling
                </Button>
              </div>
            </form>
          </Form>
          
          {/* Rework Dialog */}
          <Dialog open={showReworkDialog} onOpenChange={setShowReworkDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Route to Rework?</DialogTitle>
                <DialogDescription>
                  A defect has been detected. Would you like to route this part for rework?
                </DialogDescription>
              </DialogHeader>
              
              <DialogFooter className="flex space-x-2 justify-end">
                <Button 
                  variant="outline" 
                  onClick={handleReworkDialogCancel}
                >
                  No, Continue
                </Button>
                
                <Button 
                  variant="default"
                  onClick={handleReworkDialogConfirm}
                >
                  Yes, Route to Rework
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
