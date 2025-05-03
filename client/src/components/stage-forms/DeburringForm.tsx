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
import { Textarea } from "@/components/ui/textarea";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { WashingMachine, Ban, Save } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn, formatDate } from "@/lib/utils";

const formSchema = z.object({
  slugId: z.number(),
  slugCode: z.string().min(3, "Slug code is required"),
  visualStatus: z.enum(["ok", "defect"]),
  defectNotes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface DeburringFormProps {
  className?: string;
}

export default function DeburringForm({ className }: DeburringFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [slug, setSlug] = useState<any>(null);
  const [showDefectAlert, setShowDefectAlert] = useState(false);
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      slugId: 0,
      slugCode: "",
      visualStatus: "ok",
      defectNotes: "",
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
        throw new Ban("Slug not found");
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

  const createDeburring = useMutation({
    mutationFn: async (data: FormData) => {
      const { slugCode, ...requestData } = data;
      const response = await apiRequest("POST", "/api/deburring", requestData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Deburring record saved",
        description: "The deburring operation has been successfully recorded.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/deburring"] });
      
      form.reset({
        slugId: 0,
        slugCode: "",
        visualStatus: "ok",
        defectNotes: "",
      });
      
      setSlug(null);
      setShowDefectAlert(false);
    },
    onError: (error) => {
      toast({
        title: "Ban saving deburring record",
        description: error.message || "An error occurred while saving the deburring record.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createDeburring.mutate(data);
  };

  const handleSlugCodeScan = (code: string) => {
    form.setValue("slugCode", code);
    // The query will automatically fetch the slug data
  };

  const handleVisualStatusChange = (value: string) => {
    const isDefect = value === "defect";
    form.setValue("visualStatus", isDefect ? "defect" : "ok");
    setShowDefectAlert(isDefect);
    
    if (!isDefect) {
      form.setValue("defectNotes", "");
    }
  };

  return (
    <div id="stage-4" className={cn("form-container mb-6", className)}>
      <Card className="card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-semibold text-neutral-500 flex items-center">
            <WashingMachine className="mr-2 h-5 w-5 text-primary" />
            Deburr & Clean
          </CardTitle>
          <Badge variant="secondary" className="bg-primary-light text-white">Stage 4</Badge>
        </CardHeader>
        
        <CardContent>
          {/* Defect Alert Banner (Hidden by default) */}
          {showDefectAlert && (
            <Alert variant="destructive" className="mb-4">
              <Ban className="h-4 w-4" />
              <AlertTitle>Defect detected!</AlertTitle>
              <AlertDescription>Part requires rework.</AlertDescription>
            </Alert>
          )}
          
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
                  
                  {/* Defect Notes (Hidden by default) */}
                  {form.watch("visualStatus") === "defect" && (
                    <FormField
                      control={form.control}
                      name="defectNotes"
                      render={({ field }) => (
                        <FormItem className="mb-4">
                          <FormLabel>Defect Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe the defect..."
                              className="h-32"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
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
                          <span className="text-muted-foreground">Weight:</span>
                          <span className="font-medium">{slug.weight} kg</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Length:</span>
                          <span className="font-medium">{slug.length} mm</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Created Date:</span>
                          <span className="font-medium">{formatDate(slug.createdAt)}</span>
                        </div>
                      </div>
                    ) : form.watch('slugCode') ? (
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
                    setSlug(null);
                    setShowDefectAlert(false);
                  }}
                >
                  Cancel
                </Button>
                
                <Button 
                  type="submit"
                  disabled={createDeburring.isPending || !slug}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Complete Deburring
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
