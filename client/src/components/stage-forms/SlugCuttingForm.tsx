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
import { Scissors, Save } from "lucide-react";
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
import { generateSlugCode } from "@/lib/utils";

const formSchema = z.object({
  slugCode: z.string().min(3, "Slug code must be at least 3 characters"),
  rawMaterialId: z.coerce.number(),
  batchCode: z.string().min(3, "Batch code must be at least 3 characters"),
  bladeThickness: z.coerce.number().min(0.1, "Blade thickness must be positive"),
  cuttingSpeed: z.coerce.number().min(1, "Cutting speed must be a positive integer"),
  weight: z.coerce.number().min(0.1, "Weight must be positive"),
  length: z.coerce.number().min(0.1, "Length must be positive"),
  appearance: z.enum(["excellent", "good", "acceptable", "poor", "unacceptable"]),
  startTime: z.string(),
});

type FormData = z.infer<typeof formSchema>;

export default function SlugCuttingForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [batchDetails, setBatchDetails] = useState<any>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      slugCode: generateSlugCode(),
      rawMaterialId: 0,
      batchCode: "",
      bladeThickness: 0.5,
      cuttingSpeed: 120,
      weight: 0,
      length: 0,
      appearance: "good",
      startTime: new Date().toISOString(),
    },
  });

  const createSlugCutting = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("POST", "/api/slug-cutting", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Slug cutting created",
        description: "The slug cutting has been successfully recorded.",
      });

      queryClient.invalidateQueries({ queryKey: ["/api/slug-cutting"] });

      // Reset form with a new slug code
      form.reset({
        slugCode: generateSlugCode(),
        rawMaterialId: 0,
        batchCode: "",
        bladeThickness: 0.5,
        cuttingSpeed: 120,
        weight: 0,
        length: 0,
        appearance: "good",
        startTime: new Date().toISOString(),
      });

      setBatchDetails(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "An error occurred while saving the slug cutting data.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createSlugCutting.mutate(data);
  };

  const handleBatchScan = async (code: string) => {
    try {
      form.setValue("batchCode", code);

      // Fetch batch details - in a real app, this would be from the API
      // Mock data for demonstration
      const mockBatchDetails = {
        id: 123,
        batchCode: code,
        material: "AISI 4140",
        supplier: "Steel Dynamics Inc.",
        receivedDate: "2023-05-15",
        quantity: 25,
        totalWeight: 750.5,
        remainingQuantity: 18,
      };

      setBatchDetails(mockBatchDetails);
      form.setValue("rawMaterialId", mockBatchDetails.id);

      toast({
        title: "Batch found",
        description: `Successfully scanned batch: ${code}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to retrieve batch details. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div id="stage-2" className="form-container mb-6">
      <Card className="card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-semibold text-neutral-500 flex items-center">
            <Scissors className="mr-2 h-5 w-5 text-primary" />
            Slug Cutting
          </CardTitle>
          <Badge variant="secondary" className="bg-primary-light text-white">Stage 2</Badge>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div>
                  <FormField
                    control={form.control}
                    name="slugCode"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Slug Code</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="batchCode"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Batch Code (Scan)</FormLabel>
                        <FormControl>
                          <BarcodeScanner
                            onScan={handleBatchScan}
                            placeholder="Scan or enter batch code"
                            value={field.value}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {batchDetails && (
                    <div className="mb-4 p-3 bg-muted/50 rounded-md border">
                      <h3 className="font-medium mb-2 text-sm">Batch Details</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted-foreground">Material:</span>
                        <span>{batchDetails.material}</span>
                        <span className="text-muted-foreground">Supplier:</span>
                        <span>{batchDetails.supplier}</span>
                        <span className="text-muted-foreground">Received:</span>
                        <span>{batchDetails.receivedDate}</span>
                        <span className="text-muted-foreground">Remaining:</span>
                        <span>{batchDetails.remainingQuantity} of {batchDetails.quantity}</span>
                      </div>
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="appearance"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Visual Appearance</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select visual appearance" />
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
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="bladeThickness"
                      render={({ field }) => (
                        <FormItem className="mb-4">
                          <FormLabel>Blade Thickness (mm)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="cuttingSpeed"
                      render={({ field }) => (
                        <FormItem className="mb-4">
                          <FormLabel>Cutting Speed (rpm)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="weight"
                      render={({ field }) => (
                        <FormItem className="mb-4">
                          <FormLabel>Weight (kg)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="length"
                      render={({ field }) => (
                        <FormItem className="mb-4">
                          <FormLabel>Length (mm)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="mb-4 p-3 bg-muted/50 rounded-md border">
                    <h3 className="font-medium mb-2 text-sm">Processing Information</h3>
                    <div className="text-sm">
                      <p>Start Time: {new Date().toLocaleString()}</p>
                      <p className="text-muted-foreground mt-1">
                        End time will be recorded when the process is completed.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={createSlugCutting.isPending}
                  className="w-full md:w-auto"
                >
                  {createSlugCutting.isPending ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Slug Cutting
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}