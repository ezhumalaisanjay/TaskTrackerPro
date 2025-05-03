import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { generateBatchCode, cn } from "@/lib/utils";

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
import { Archive, Upload, Save } from "lucide-react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const formSchema = z.object({
  batchCode: z.string().min(3, "Batch code must be at least 3 characters"),
  weight: z.coerce.number().positive("Weight must be positive"),
  quantity: z.coerce.number().int().positive("Quantity must be a positive integer"),
  diameter: z.coerce.number().positive("Diameter must be positive"),
  length: z.coerce.number().positive("Length must be positive"),
  appearance: z.enum(["excellent", "good", "acceptable", "poor", "unacceptable"]),
  supplierCertificate: z.string().optional(),
  qcDecision: z.enum(["accept", "reject"]),
});

type FormData = z.infer<typeof formSchema>;

interface RawMaterialFormProps {
  className?: string;
}

export default function RawMaterialForm({ className }: RawMaterialFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      batchCode: generateBatchCode(),
      weight: undefined,
      quantity: undefined,
      diameter: undefined,
      length: undefined,
      appearance: undefined,
      supplierCertificate: "",
      qcDecision: "accept",
    },
  });

  const createRawMaterial = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("POST", "/api/raw-materials", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Raw material receipt saved",
        description: "The raw material has been successfully added to inventory.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/raw-materials"] });
      form.reset({
        batchCode: generateBatchCode(),
        weight: undefined,
        quantity: undefined,
        diameter: undefined,
        length: undefined,
        appearance: undefined,
        supplierCertificate: "",
        qcDecision: "accept",
      });
      setSelectedFile(null);
    },
    onError: (error) => {
      toast({
        title: "Error saving raw material",
        description: error.message || "An error occurred while saving the raw material receipt.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    // In a real implementation, we would upload the file first and get a URL
    // For this demo, we'll just simulate it by setting the filename
    if (selectedFile) {
      data.supplierCertificate = selectedFile.name;
    }
    
    createRawMaterial.mutate(data);
  };

  const handleBatchCodeScan = (code: string) => {
    form.setValue("batchCode", code);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    
    if (file) {
      form.setValue("supplierCertificate", file.name);
    } else {
      form.setValue("supplierCertificate", "");
    }
  };

  return (
    <div id="stage-1" className={cn("form-container active mb-6", className)}>
      <Card className="card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-semibold text-neutral-500 flex items-center">
            <Archive className="mr-2 h-5 w-5 text-primary" />
            Raw Material Receipt & QC
          </CardTitle>
          <Badge variant="secondary" className="bg-primary-light text-white">Stage 1</Badge>
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
                        <FormLabel>Batch/Lot Barcode</FormLabel>
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
                  
                  {/* Quantity Section */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <FormField
                      control={form.control}
                      name="weight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Weight (kg)</FormLabel>
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
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity (pcs)</FormLabel>
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
                  </div>
                  
                  {/* Dimensions Section */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <FormField
                      control={form.control}
                      name="diameter"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Diameter (mm)</FormLabel>
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
                      name="length"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Length (mm)</FormLabel>
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
                </div>
                
                {/* Right Column */}
                <div>
                  {/* QC Section */}
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
                  
                  <FormField
                    control={form.control}
                    name="supplierCertificate"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>Supplier Certificate</FormLabel>
                        <div className="flex">
                          <Input
                            className="flex-1 rounded-r-none bg-muted"
                            placeholder="No file selected"
                            readOnly
                            value={selectedFile?.name || ""}
                            {...field}
                          />
                          <label htmlFor="file-upload">
                            <Button 
                              type="button" 
                              className="rounded-l-none"
                              asChild
                            >
                              <div>
                                <Upload className="h-4 w-4 mr-1" />
                                <input
                                  id="file-upload"
                                  type="file"
                                  className="hidden"
                                  onChange={handleFileChange}
                                  accept=".pdf,.jpg,.png,.doc,.docx"
                                />
                              </div>
                            </Button>
                          </label>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="qcDecision"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>QC Decision</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex space-x-4"
                          >
                            <div className="flex items-center">
                              <RadioGroupItem 
                                value="accept" 
                                id="qc-accept" 
                                className="text-primary"
                              />
                              <Label htmlFor="qc-accept" className="ml-2">Accept</Label>
                            </div>
                            
                            <div className="flex items-center">
                              <RadioGroupItem 
                                value="reject" 
                                id="qc-reject" 
                                className="text-destructive"
                              />
                              <Label htmlFor="qc-reject" className="ml-2">Reject</Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                  disabled={createRawMaterial.isPending}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Receipt
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
