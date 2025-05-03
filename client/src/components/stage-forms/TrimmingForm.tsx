import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Slice, Save } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  forgedPartId: z.number(),
  partCode: z.string().min(3, "Part code is required"),
  strokeLength: z.coerce.number().positive("Stroke length must be positive"),
  offset: z.coerce.number().nonnegative("Offset must be non-negative"),
  appearance: z.enum(["excellent", "good", "acceptable", "poor", "unacceptable"]),
});

type FormData = z.infer<typeof formSchema>;

interface TrimmingFormProps {
  className?: string;
}

export default function TrimmingForm({ className }: TrimmingFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [forgedPart, setForgedPart] = useState<any>(null);
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      forgedPartId: 0,
      partCode: "",
      strokeLength: undefined,
      offset: undefined,
      appearance: undefined,
    },
  });

  // This query would need to be updated in a real app to fetch from the correct endpoint
  const { data: partData, isLoading: isLoadingPart } = useQuery({
    queryKey: ['/api/heating-forging', form.watch('partCode')],
    enabled: !!form.watch('partCode') && form.watch('partCode').length > 3,
    queryFn: async () => {
      // In a real app, you'd have an endpoint to get a forged part by its code
      const response = await fetch(`/api/heating-forging/${form.watch('partCode')}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Forged part not found");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setForgedPart(data);
      form.setValue("forgedPartId", data.id);
    },
    onError: () => {
      setForgedPart(null);
      form.setValue("forgedPartId", 0);
    },
    // For this demonstration, we're using a mock enabled: false
    enabled: false
  });

  const createTrimming = useMutation({
    mutationFn: async (data: FormData) => {
      const { partCode, ...requestData } = data;
      const response = await apiRequest("POST", "/api/trimming", requestData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Trimming record saved",
        description: "The trimming operation has been successfully recorded.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/trimming"] });
      
      form.reset({
        forgedPartId: 0,
        partCode: "",
        strokeLength: undefined,
        offset: undefined,
        appearance: undefined,
      });
      
      setForgedPart(null);
    },
    onError: (error) => {
      toast({
        title: "Error saving trimming record",
        description: error.message || "An error occurred while saving the trimming record.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    // For demonstration, we'll use mock data since we don't have a real forged part
    // In a real app, this would use the actual forgedPartId from the query
    const mockData = {
      ...data,
      forgedPartId: 1 // Mock ID
    };
    
    createTrimming.mutate(mockData);
  };

  const handlePartCodeScan = (code: string) => {
    form.setValue("partCode", code);
    
    // For demonstration, create a mock forged part object
    // In a real app, this would be fetched by the query
    const mockForgedPart = {
      id: 1,
      partCode: code,
      furnaceTemp: 1200,
      measuredTemp: 1180,
      dimensions: {
        height: 120.5,
        width: 45.2,
        depth: 35.8
      },
      appearance: "good",
      slug: {
        slugCode: "SLG-20230615-001",
        weight: 4.25,
        length: 150.5
      }
    };
    
    setForgedPart(mockForgedPart);
    form.setValue("forgedPartId", mockForgedPart.id);
    
    toast({
      title: "Part found",
      description: `Successfully scanned part: ${code}`,
    });
  };

  return (
    <div id="stage-6" className={cn("form-container mb-6", className)}>
      <Card className="card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-semibold text-neutral-500 flex items-center">
            <Slice className="mr-2 h-5 w-5 text-primary" />
            Trimming
          </CardTitle>
          <Badge variant="secondary" className="bg-primary-light text-white">Stage 6</Badge>
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
                  
                  {/* Trimming Parameters */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <FormField
                      control={form.control}
                      name="strokeLength"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stroke Length (mm)</FormLabel>
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
                    
                    <FormField
                      control={form.control}
                      name="offset"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Offset (mm)</FormLabel>
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
                </div>
                
                {/* Right Column - Forging Data Summary */}
                <div>
                  <div className="bg-muted rounded-lg p-4">
                    <h3 className="text-lg font-medium mb-3 text-neutral-500">Forging Data Summary</h3>
                    
                    {isLoadingPart ? (
                      <p>Loading part information...</p>
                    ) : forgedPart ? (
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground mb-2">Part Details</h4>
                          <div className="grid grid-cols-2 gap-2">
                            <span className="text-muted-foreground">Part Code:</span>
                            <span className="font-medium">{forgedPart.partCode}</span>
                            
                            <span className="text-muted-foreground">Furnace Temp:</span>
                            <span className="font-medium">{forgedPart.furnaceTemp}°C</span>
                            
                            <span className="text-muted-foreground">Measured Temp:</span>
                            <span className="font-medium">{forgedPart.measuredTemp}°C</span>
                          </div>
                        </div>
                        
                        <Separator />
                        
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground mb-2">Dimensions</h4>
                          <div className="grid grid-cols-2 gap-2">
                            <span className="text-muted-foreground">Height:</span>
                            <span className="font-medium">{forgedPart.dimensions.height} mm</span>
                            
                            <span className="text-muted-foreground">Width:</span>
                            <span className="font-medium">{forgedPart.dimensions.width} mm</span>
                            
                            <span className="text-muted-foreground">Depth:</span>
                            <span className="font-medium">{forgedPart.dimensions.depth} mm</span>
                          </div>
                        </div>
                        
                        <Separator />
                        
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground mb-2">Original Slug</h4>
                          <div className="grid grid-cols-2 gap-2">
                            <span className="text-muted-foreground">Slug Code:</span>
                            <span className="font-medium">{forgedPart.slug.slugCode}</span>
                            
                            <span className="text-muted-foreground">Weight:</span>
                            <span className="font-medium">{forgedPart.slug.weight} kg</span>
                            
                            <span className="text-muted-foreground">Length:</span>
                            <span className="font-medium">{forgedPart.slug.length} mm</span>
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
                    setForgedPart(null);
                  }}
                >
                  Cancel
                </Button>
                
                <Button 
                  type="submit"
                  disabled={createTrimming.isPending || !forgedPart}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Complete Trimming
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
