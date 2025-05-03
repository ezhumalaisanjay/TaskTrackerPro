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
import { BadgeCheck, Save, Package, Minus, Plus } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";

const formSchema = z.object({
  partIds: z.array(z.string()).min(1, "At least one part must be selected"),
  oilBatch: z.string().min(2, "Oil batch must be specified"),
  packingMaterial: z.string().min(2, "Packing material must be specified"),
  quantityPacked: z.coerce.number().min(1, "Quantity must be positive"),
  totalWeight: z.coerce.number().min(0.1, "Total weight must be positive"),
  packingNotes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function OilingPackingForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [scannedParts, setScannedParts] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      partIds: [],
      oilBatch: "OIL-B2023",
      packingMaterial: "Bubble wrap and cardboard box",
      quantityPacked: 1,
      totalWeight: 0,
      packingNotes: "",
    },
  });

  const createOilingPacking = useMutation({
    mutationFn: async (data: FormData) => {
      // Transform data for API
      const payload = {
        ...data,
        partIds: JSON.stringify(data.partIds),
      };
      
      const response = await apiRequest("POST", "/api/oiling-packing", payload);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Oiling & Packing completed",
        description: "The oiling and packing process has been successfully recorded.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/oiling-packing"] });
      
      // Reset form
      form.reset({
        partIds: [],
        oilBatch: "OIL-B2023",
        packingMaterial: "Bubble wrap and cardboard box",
        quantityPacked: 1,
        totalWeight: 0,
        packingNotes: "",
      });
      
      setScannedParts([]);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "An error occurred while saving the oiling and packing data.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createOilingPacking.mutate(data);
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
        variant: "destructive",
      });
      return;
    }
    
    // Add to scanned parts and form value
    const updatedParts = [...scannedParts, code];
    setScannedParts(updatedParts);
    form.setValue("partIds", updatedParts);
    
    // Update quantity
    form.setValue("quantityPacked", updatedParts.length);
    
    // Mock total weight calculation (in real app would fetch part weight from API)
    const mockWeight = updatedParts.length * 2.5; // Assuming average weight of 2.5kg per part
    form.setValue("totalWeight", mockWeight);
    
    toast({
      title: "Part added",
      description: `Successfully added part: ${code}`,
    });
  };

  const handleRemovePart = (partCode: string) => {
    const updatedParts = scannedParts.filter(code => code !== partCode);
    setScannedParts(updatedParts);
    form.setValue("partIds", updatedParts);
    
    // Update quantity
    form.setValue("quantityPacked", updatedParts.length);
    
    // Update mock total weight
    const mockWeight = updatedParts.length * 2.5; // Assuming average weight of 2.5kg per part
    form.setValue("totalWeight", mockWeight);
  };

  return (
    <div id="stage-17" className="form-container mb-6">
      <Card className="card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-semibold text-neutral-500 flex items-center">
            <BadgeCheck className="mr-2 h-5 w-5 text-primary" />
            Oiling & Packing
          </CardTitle>
          <Badge variant="secondary" className="bg-primary-light text-white">Stage 17</Badge>
        </CardHeader>
        
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div>
                  {/* Part Selection Section */}
                  <div className="mb-4">
                    <FormLabel>Select Parts for Packing</FormLabel>
                    
                    {isScanning ? (
                      <div className="mb-2">
                        <BarcodeScanner
                          onScan={handlePartScan}
                          placeholder="Scan part barcode..."
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
                                No parts selected. Scan parts to add them to the packing list.
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
                  
                  <FormField
                    control={form.control}
                    name="packingNotes"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Packing Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter any special instructions or notes about packing..."
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
                  <FormField
                    control={form.control}
                    name="oilBatch"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Oil Batch Number</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="packingMaterial"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Packing Material</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="quantityPacked"
                      render={({ field }) => (
                        <FormItem className="mb-4">
                          <FormLabel>Quantity</FormLabel>
                          <div className="flex">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="rounded-r-none"
                              onClick={() => {
                                const newValue = Math.max(1, field.value - 1);
                                field.onChange(newValue);
                              }}
                              disabled={field.value <= 1}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <FormControl>
                              <Input
                                type="number"
                                className="rounded-none text-center"
                                {...field}
                              />
                            </FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="rounded-l-none"
                              onClick={() => {
                                const newValue = field.value + 1;
                                field.onChange(newValue);
                              }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="totalWeight"
                      render={({ field }) => (
                        <FormItem className="mb-4">
                          <FormLabel>Total Weight (kg)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.1"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="p-3 bg-muted/50 rounded-md border mb-4">
                    <h3 className="font-medium text-sm mb-2">Packing Instructions</h3>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>Apply oil coating evenly to prevent corrosion</li>
                      <li>Use VCI paper between parts if packing multiple items</li>
                      <li>Ensure parts are secured and cannot move in packaging</li>
                      <li>Label package with part number and quantity</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={createOilingPacking.isPending || scannedParts.length === 0}
                  className="w-full md:w-auto"
                >
                  {createOilingPacking.isPending ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <Package className="mr-2 h-4 w-4" />
                      Complete Oiling & Packing
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