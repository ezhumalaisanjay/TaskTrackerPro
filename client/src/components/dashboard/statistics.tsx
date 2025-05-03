import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ArrowUpCircle, 
  Box, 
  Zap, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  ArrowDownCircle 
} from "lucide-react";

export function Statistics() {
  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Active Production
          </CardTitle>
          <Box className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">142</div>
          <p className="text-xs text-muted-foreground">
            <span className="text-green-500 flex items-center">
              <TrendingUp className="mr-1 h-3 w-3" />
              +14%
            </span>{" "}
            from last month
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Cycle Time (avg)
          </CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">24.3h</div>
          <p className="text-xs text-muted-foreground">
            <span className="text-red-500 flex items-center">
              <TrendingDown className="mr-1 h-3 w-3" />
              +5%
            </span>{" "}
            longer than target
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Quality Rating
          </CardTitle>
          <ArrowUpCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">95.8%</div>
          <p className="text-xs text-muted-foreground">
            <span className="text-green-500 flex items-center">
              <TrendingUp className="mr-1 h-3 w-3" />
              +2.1%
            </span>{" "}
            from last month
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Bottlenecks
          </CardTitle>
          <Zap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">2</div>
          <p className="text-xs text-muted-foreground">
            <span className="text-green-500 flex items-center">
              <ArrowDownCircle className="mr-1 h-3 w-3" />
              -1
            </span>{" "}
            from last week
          </p>
        </CardContent>
      </Card>
    </>
  );
}