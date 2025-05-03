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
import { Truck, Calendar, Save, Printer, FileCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn, formatDate } from "@/lib/utils";

const formSchema = z.object({
  partIds: z.array(z.string()).min(1, "At least one part must be selected"),
  carrier: z.string().min(2, "Carrier name is required"),
  trackingNumber: z.string().min(2, "Tracking number is required"),
  dispatchDate: z.date(),
  billOfLading: z.string().optional(),
  additionalInfo: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function DispatchForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [scannedParts, setScannedParts] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [showBillOfLadingPreview, setShowBillOfLadingPreview] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      partIds: [],
      carrier: "",
      trackingNumber: "",
      dispatchDate: new Date(),
      billOfLading: "",
      additionalInfo: "",
    },
  });

  const createDispatch = useMutation({
    mutationFn: async (data: FormData) => {
      // Transform data for API
      const payload = {
        ...data,
        partIds: JSON.stringify(data.partIds),
        dispatchDate: data.dispatchDate.toISOString(),
      };
      
      const response = await apiRequest("POST", "/api/dispatch", payload);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Dispatch completed",
        description: "The dispatch has been successfully recorded.",

      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/dispatch"] });
      
      // Reset form
      form.reset({
        partIds: [],
        carrier: "",
        trackingNumber: "",
        dispatchDate: new Date(),
        billOfLading: "",
        additionalInfo: "",
      });
      
      setScannedParts([]);
    },
    onError: (error) => {
      toast({
        title: "Error creating dispatch",
        description: error.message || "An error occurred while creating the dispatch record.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createDispatch.mutate(data);
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
    
    toast({
      title: "Part added",
      description: `Successfully added part: ${code}`,
    });
  };

  const handleRemovePart = (partCode: string) => {
    const updatedParts = scannedParts.filter(code => code !== partCode);
    setScannedParts(updatedParts);
    form.setValue("partIds", updatedParts);
  };

  const generateBoL = () => {
    // In a real app, this would generate a proper BoL
    const bolNumber = `BOL-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    form.setValue("billOfLading", bolNumber);
    setShowBillOfLadingPreview(true);
    
    toast({
      title: "Bill of Lading generated",
      description: `Generated Bill of Lading: ${bolNumber}`,
    });
  };

  const printDocuments = () => {
    toast({
      title: "Printing requested",
      description: "Dispatch documents have been sent to the printer.",
    });
  };

  return (
    <div id="stage-18" className="form-container mb-6">
      <Card className="card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-semibold text-neutral-500 flex items-center">
            <Truck className="mr-2 h-5 w-5 text-primary" />
            Dispatch
          </CardTitle>
          <Badge variant="secondary" className="bg-primary-light text-white">Stage 18</Badge>
        </CardHeader>
        
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div>
                  {/* Part Selection Section */}
                  <div className="mb-4">
                    <FormLabel>Select Parts for Dispatch</FormLabel>
                    
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
                                No parts selected. Scan parts to add them to the dispatch list.
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
                    name="additionalInfo"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Additional Information</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter any special instructions or notes for the carrier..."
                            className="h-24"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={generateBoL}
                      className="flex-1"
                    >
                      <FileCheck className="mr-2 h-4 w-4" />
                      Generate Bill of Lading
                    </Button>
                    
                    <Button
                      type="button"
                      variant="outline"
                      onClick={printDocuments}
                      className="flex-1"
                    >
                      <Printer className="mr-2 h-4 w-4" />
                      Print Documents
                    </Button>
                  </div>
                </div>
                
                {/* Right Column */}
                <div>
                  <FormField
                    control={form.control}
                    name="carrier"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Carrier Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="trackingNumber"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Tracking Number</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="dispatchDate"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Dispatch Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  formatDate(field.value)
                                ) : (
                                  <span>Select date</span>
                                )}
                                <Calendar className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="billOfLading"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Bill of Lading #</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            readOnly={showBillOfLadingPreview}
                            className={showBillOfLadingPreview ? "bg-muted" : ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {showBillOfLadingPreview && (
                    <div className="p-3 bg-muted/50 rounded-md border mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-medium text-sm">Bill of Lading Preview</h3>
                        <Badge variant="outline">{form.getValues("billOfLading")}</Badge>
                      </div>
                      <div className="text-xs space-y-1 text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Carrier:</span>
                          <span className="font-medium">{form.getValues("carrier") || "N/A"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Date:</span>
                          <span className="font-medium">{formatDate(form.getValues("dispatchDate"))}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Item Count:</span>
                          <span className="font-medium">{scannedParts.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Status:</span>
                          <span className="font-medium text-green-500">Ready for dispatch</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={createDispatch.isPending || scannedParts.length === 0}
                  className="w-full md:w-auto"
                >
                  {createDispatch.isPending ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <Truck className="mr-2 h-4 w-4" />
                      Complete Dispatch
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