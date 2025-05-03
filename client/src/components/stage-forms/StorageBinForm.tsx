import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { Archive, Info, Save } from "lucide-react";
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
  batchCode: z.string().min(1, "Batch code is required"),
  rawMaterialId: z.number(),
  warehouse: z.string().min(1, "Warehouse is required"),
  binLocation: z.string().min(1, "Bin location is required"),
});

type FormData = z.infer<typeof formSchema>;

interface StorageBinFormProps {
  className?: string;
}

export default function StorageBinForm({ className }: StorageBinFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      batchCode: "",
      rawMaterialId: 0,
      warehouse: "",
      binLocation: "",
    },
  });

  const { data: warehouseSummary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ["/api/warehouses/summary"],
    enabled: true,
  });

  const assignLocation = useMutation({
    mutationFn: async (data: Omit<FormData, "batchCode">) => {
      const response = await apiRequest("POST", "/api/storage-bins", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Location assigned",
        description: "The raw material has been successfully assigned to the bin location.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/storage-bins"] });
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error assigning location",
        description: error.message || "An error occurred while assigning the bin location.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    const { batchCode, ...rest } = data;
    assignLocation.mutate(rest);
  };

  const handleBatchCodeScan = async (code: string) => {
    try {
      form.setValue("batchCode", code);
      
      // Fetch the raw material by batch code
      const response = await fetch(`/api/raw-materials/batch/${code}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Raw material not found");
      }
      
      const rawMaterial = await response.json();
      form.setValue("rawMaterialId", rawMaterial.id);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to find raw material with that batch code.",
        variant: "destructive",
      });
    }
  };

  return (
    <div id="stage-2" className={cn("form-container mb-6", className)}>
      <Card className="card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-semibold text-neutral-500 flex items-center">
            <Archive className="mr-2 h-5 w-5 text-primary" />
            Putaway
          </CardTitle>
          <Badge variant="secondary" className="bg-primary-light text-white">Stage 2</Badge>
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
                    name="batchCode"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Batch Barcode</FormLabel>
                        <FormControl>
                          <BarcodeScanner
                            onScan={handleBatchCodeScan}
                            placeholder="Scan or enter batch code"
                            value={field.value}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Location Section */}
                  <FormField
                    control={form.control}
                    name="warehouse"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Warehouse</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select warehouse" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="warehouse-a">Warehouse A</SelectItem>
                            <SelectItem value="warehouse-b">Warehouse B</SelectItem>
                            <SelectItem value="warehouse-c">Warehouse C</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="binLocation"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Bin/Location</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select bin location" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="a-001">A-001</SelectItem>
                            <SelectItem value="a-002">A-002</SelectItem>
                            <SelectItem value="a-003">A-003</SelectItem>
                            <SelectItem value="b-001">B-001</SelectItem>
                            <SelectItem value="b-002">B-002</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Right Column - Stock Summary */}
                <div className="bg-muted rounded-lg p-4">
                  <h3 className="text-lg font-medium mb-3 text-neutral-500">Available Stock Summary</h3>
                  
                  {isLoadingSummary ? (
                    <p>Loading summary...</p>
                  ) : (
                    <>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Raw Material:</span>
                          <span className="font-medium">
                            {warehouseSummary?.totalRawMaterial || "0 kg"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Available Bins:</span>
                          <span className="font-medium">
                            {warehouseSummary?.availableBins || 0}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Warehouse A Capacity:</span>
                          <span className="font-medium">
                            {warehouseSummary?.warehouseCapacity?.["Warehouse A"] || "0%"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Warehouse B Capacity:</span>
                          <span className="font-medium">
                            {warehouseSummary?.warehouseCapacity?.["Warehouse B"] || "0%"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Warehouse C Capacity:</span>
                          <span className="font-medium">
                            {warehouseSummary?.warehouseCapacity?.["Warehouse C"] || "0%"}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-neutral-200">
                        <div className="flex items-center text-primary">
                          <Info className="h-4 w-4 mr-1" />
                          <span className="text-sm">Recommended: Warehouse B, Bin B-001</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              {/* Submit Buttons */}
              <div className="flex justify-end space-x-4 mt-6">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => form.reset()}
                >
                  Cancel
                </Button>
                
                <Button 
                  type="submit"
                  disabled={assignLocation.isPending}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Assign Location
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
