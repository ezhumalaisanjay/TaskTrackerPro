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
import { Crosshair, Save, AlertTriangle } from "lucide-react";
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

const formSchema = z.object({
  slugId: z.number(),
  slugCode: z.string().min(3, "Slug code is required"),
  furnaceTemp: z.coerce.number().int().positive("Furnace temperature must be a positive integer"),
  strokeLength: z.coerce.number().positive("Stroke length must be positive"),
  offset: z.coerce.number().nonnegative("Offset must be non-negative"),
  measuredTemp: z.coerce.number().int().positive("Measured temperature must be a positive integer"),
  dimensions: z.object({
    height: z.coerce.number().positive("Height must be positive"),
    width: z.coerce.number().positive("Width must be positive"),
    depth: z.coerce.number().positive("Depth must be positive"),
  }),
  appearance: z.enum(["excellent", "good", "acceptable", "poor", "unacceptable"]),
});

type FormData = z.infer<typeof formSchema>;

interface HeatingForgingFormProps {
  className?: string;
}

export default function HeatingForgingForm({ className }: HeatingForgingFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [slug, setSlug] = useState<any>(null);
  const [dimensionWarnings, setDimensionWarnings] = useState<{[key: string]: boolean}>({
    height: false,
    width: false,
    depth: false
  });
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      slugId: 0,
      slugCode: "",
      furnaceTemp: undefined,
      strokeLength: undefined,
      offset: undefined,
      measuredTemp: undefined,
      dimensions: {
        height: undefined,
        width: undefined,
        depth: undefined,
      },
      appearance: undefined,
    },
  });

  const { data: slugData, isLoading: isLoadingSlug } = useQuery({
    queryKey: ['/api/slug-cutting', form.watch('slugCode')],
    enabled: !!form.watch('slugCode') && form.watch('slugCode').length > 3,
    queryFn: async () => {
      const response = await fetch(`/api/slug-cutting/${form.watch('slugCode')}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Slug not found");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setSlug(data);
      form.setValue("slugId", data.id);
    },
    onError: () => {
      setSlug(null);
      form.setValue("slugId", 0);
    },
  });

  const createHeatingForging = useMutation({
    mutationFn: async (data: FormData) => {
      // Extract and transform data for API
      const { slugCode, ...requestData } = data;
      
      // Convert dimensions object to the expected format for the API
      const dimensionsJson = JSON.stringify(data.dimensions);
      
      const response = await apiRequest("POST", "/api/heating-forging", {
        ...requestData,
        dimensions: dimensionsJson
      });
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Heating & forging record saved",
        description: "The heating and forging operation has been successfully recorded.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/heating-forging"] });
      
      form.reset({
        slugId: 0,
        slugCode: "",
        furnaceTemp: undefined,
        strokeLength: undefined,
        offset: undefined,
        measuredTemp: undefined,
        dimensions: {
          height: undefined,
          width: undefined,
          depth: undefined,
        },
        appearance: undefined,
      });
      
      setSlug(null);
      setDimensionWarnings({
        height: false,
        width: false,
        depth: false
      });
    },
    onError: (error) => {
      toast({
        title: "Error saving heating & forging record",
        description: error.message || "An error occurred while saving the heating and forging record.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createHeatingForging.mutate(data);
  };

  const handleSlugCodeScan = (code: string) => {
    form.setValue("slugCode", code);
    // The query will automatically fetch the slug data
  };

  // Check dimension tolerances - this is a simplified version
  // In a real app, you'd have specific tolerance ranges for each dimension
  const checkDimensionTolerance = (dimension: string, value: number) => {
    if (!slug) return;
    
    // Example tolerance checks (would be more specific in a real app)
    let isOutOfTolerance = false;
    
    switch(dimension) {
      case 'height':
        // For example: height should be within 10% of original length
        isOutOfTolerance = value > slug.length * 1.1 || value < slug.length * 0.9;
        break;
      case 'width':
        // For example: width should be within 5% of original diameter
        isOutOfTolerance = value > slug.diameter * 1.05 || value < slug.diameter * 0.95;
        break;
      case 'depth':
        // For example: depth should be within 10% of original diameter
        isOutOfTolerance = value > slug.diameter * 1.1 || value < slug.diameter * 0.9;
        break;
    }
    
    setDimensionWarnings(prev => ({
      ...prev,
      [dimension]: isOutOfTolerance
    }));
    
    if (isOutOfTolerance) {
      toast({
        title: "Dimension warning",
        description: `The ${dimension} measurement is out of tolerance range.`,
        variant: "warning",
      });
    }
  };

  return (
    <div id="stage-5" className={cn("form-container mb-6", className)}>
      <Card className="card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-semibold text-neutral-500 flex items-center">
            <Crosshair className="mr-2 h-5 w-5 text-primary" />
            Heat & Forge
          </CardTitle>
          <Badge variant="secondary" className="bg-primary-light text-white">Stage 5</Badge>
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
                    name="slugCode"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Part Barcode</FormLabel>
                        <FormControl>
                          <BarcodeScanner
                            onScan={handleSlugCodeScan}
                            placeholder="Scan or enter part code"
                            value={field.value}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Forging Parameters */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <FormField
                      control={form.control}
                      name="furnaceTemp"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Furnace Temp (°C)</FormLabel>
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
                  
                  {/* Measured Parameters */}
                  <FormField
                    control={form.control}
                    name="measuredTemp"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Measured Temp (°C)</FormLabel>
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
                  
                  {/* Dimensions */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <FormField
                      control={form.control}
                      name="dimensions.height"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center">
                            Height (mm)
                            {dimensionWarnings.height && (
                              <AlertTriangle className="h-4 w-4 ml-1 text-warning" />
                            )}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              placeholder="0.00" 
                              {...field}
                              className={cn(dimensionWarnings.height && "border-warning")}
                              onChange={(e) => {
                                const value = e.target.value === "" ? undefined : parseFloat(e.target.value);
                                field.onChange(value);
                                if (value) checkDimensionTolerance('height', value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="dimensions.width"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center">
                            Width (mm)
                            {dimensionWarnings.width && (
                              <AlertTriangle className="h-4 w-4 ml-1 text-warning" />
                            )}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              placeholder="0.00" 
                              {...field}
                              className={cn(dimensionWarnings.width && "border-warning")}
                              onChange={(e) => {
                                const value = e.target.value === "" ? undefined : parseFloat(e.target.value);
                                field.onChange(value);
                                if (value) checkDimensionTolerance('width', value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="dimensions.depth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center">
                            Depth (mm)
                            {dimensionWarnings.depth && (
                              <AlertTriangle className="h-4 w-4 ml-1 text-warning" />
                            )}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              placeholder="0.00" 
                              {...field}
                              className={cn(dimensionWarnings.depth && "border-warning")}
                              onChange={(e) => {
                                const value = e.target.value === "" ? undefined : parseFloat(e.target.value);
                                field.onChange(value);
                                if (value) checkDimensionTolerance('depth', value);
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
                
                {/* Right Column */}
                <div>
                  <div className="bg-muted rounded-lg p-4">
                    <h3 className="text-lg font-medium mb-3 text-neutral-500">Part Information</h3>
                    
                    {isLoadingSlug ? (
                      <p>Loading part information...</p>
                    ) : slug ? (
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Slug ID:</span>
                          <span className="font-medium">{slug.slugCode}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Raw Material:</span>
                          <span className="font-medium">{slug.rawMaterial?.batchCode || "Unknown"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Weight:</span>
                          <span className="font-medium">{slug.weight} kg</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Length:</span>
                          <span className="font-medium">{slug.length} mm</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Cutting Speed:</span>
                          <span className="font-medium">{slug.cuttingSpeed} m/min</span>
                        </div>
                      </div>
                    ) : form.watch('slugCode') ? (
                      <p className="text-destructive">Part not found</p>
                    ) : (
                      <p className="text-muted-foreground">Scan a part to view details</p>
                    )}
                    
                    {Object.values(dimensionWarnings).some(warning => warning) && (
                      <div className="mt-4 pt-4 border-t border-warning/30">
                        <p className="text-warning flex items-center">
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          <span>Some dimensions are out of tolerance</span>
                        </p>
                      </div>
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
                    setSlug(null);
                    setDimensionWarnings({
                      height: false,
                      width: false,
                      depth: false
                    });
                  }}
                >
                  Cancel
                </Button>
                
                <Button 
                  type="submit"
                  disabled={createHeatingForging.isPending || !slug}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Complete Forging
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
