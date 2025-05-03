import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface ActivityItem {
  id: string;
  user: {
    name: string;
    avatar: string;
    initials: string;
  };
  action: string;
  stage: string;
  partCode: string;
  timestamp: string;
  status: "completed" | "pending" | "in_progress" | "rejected";
}

// Sample data for the activity feed
const activityData: ActivityItem[] = [
  {
    id: "act1",
    user: {
      name: "Michael Chen",
      avatar: "",
      initials: "MC",
    },
    action: "completed",
    stage: "Final Inspection",
    partCode: "PT-9834",
    timestamp: "10 minutes ago",
    status: "completed",
  },
  {
    id: "act2",
    user: {
      name: "Sarah Johnson",
      avatar: "",
      initials: "SJ",
    },
    action: "started",
    stage: "Machining (Stage 2)",
    partCode: "PT-8765",
    timestamp: "25 minutes ago",
    status: "in_progress",
  },
  {
    id: "act3",
    user: {
      name: "David Miller",
      avatar: "",
      initials: "DM",
    },
    action: "rejected",
    stage: "In-Process Inspection",
    partCode: "PT-7621",
    timestamp: "45 minutes ago",
    status: "rejected",
  },
  {
    id: "act4",
    user: {
      name: "Elena Rodriguez",
      avatar: "",
      initials: "ER",
    },
    action: "sent to",
    stage: "Heat Treatment",
    partCode: "PT-8932",
    timestamp: "1 hour ago",
    status: "pending",
  },
  {
    id: "act5",
    user: {
      name: "James Taylor",
      avatar: "",
      initials: "JT",
    },
    action: "received",
    stage: "Raw Material",
    partCode: "RM-3421",
    timestamp: "2 hours ago",
    status: "completed",
  },
];

export function RecentActivity() {
  // Function to get the color of the status badge
  const getStatusColor = (status: ActivityItem["status"]) => {
    switch (status) {
      case "completed":
        return "bg-green-500/10 text-green-500 hover:bg-green-500/20";
      case "in_progress":
        return "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20";
      case "pending":
        return "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20";
      case "rejected":
        return "bg-red-500/10 text-red-500 hover:bg-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20";
    }
  };

  return (
    <div className="space-y-4">
      {activityData.map((item) => (
        <div
          key={item.id}
          className="flex items-center space-x-4 rounded-lg border p-3 bg-card text-card-foreground shadow-sm"
        >
          <Avatar>
            <AvatarImage src={item.user.avatar} />
            <AvatarFallback>{item.user.initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium leading-none">
              <span className="font-semibold">{item.user.name}</span> {item.action}{" "}
              <span className="font-medium">{item.stage}</span>
              {item.partCode && (
                <span className="ml-1">
                  for part <span className="font-mono">{item.partCode}</span>
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">{item.timestamp}</p>
          </div>
          <Badge className={getStatusColor(item.status)} variant="outline">
            {item.status}
          </Badge>
        </div>
      ))}
    </div>
  );
}