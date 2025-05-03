import { useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface StageNavigationProps {
  currentStage: number;
  totalStages: number;
}

export function StageNavigation({ currentStage, totalStages }: StageNavigationProps) {
  const [, setLocation] = useLocation();

  const navigateToStage = (stage: number) => {
    if (stage < 1 || stage > totalStages) return;
    
    const stageId = `stage-${stage}`;
    const stageElement = document.getElementById(stageId);
    
    if (stageElement) {
      // Update the URL hash
      setLocation(`/#${stageId}`);
      
      // Activate this stage's form
      const allForms = document.querySelectorAll('.form-container');
      allForms.forEach(form => form.classList.remove('active'));
      stageElement.classList.add('active');
      
      // Scroll to the stage
      stageElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="flex justify-center mt-8 mb-4">
      <div className="bg-white shadow-md rounded-lg p-4 flex items-center space-x-2">
        <Button 
          variant="ghost"
          size="icon"
          className="rounded-full hover:bg-neutral-100 text-neutral-400"
          disabled={currentStage <= 1}
          onClick={() => navigateToStage(currentStage - 1)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <span className="text-neutral-400">Stage {currentStage} of {totalStages}</span>
        
        <Button 
          variant="ghost"
          size="icon"
          className="rounded-full hover:bg-neutral-100 text-neutral-400"
          disabled={currentStage >= totalStages}
          onClick={() => navigateToStage(currentStage + 1)}
        >
          <ArrowRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
