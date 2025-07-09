// This file should be moved to ../components/ProfileCard.tsx for proper organization.
import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Goal,
  GraduationCap,
  BrainCog,
  Zap,
  Compass,
  PiggyBank,
  Earth,
  Megaphone,
  Puzzle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ProfileCardProps {
  trait?: string;
  label?: string;
  loading?: boolean;
}

const traitIcons: Record<string, React.ReactNode> = {
  goal: <Goal className="w-7 h-7 mb-1" />,
  academic_strengths: <GraduationCap className="w-7 h-7 mb-1" />,
  learning_style: <BrainCog className="w-7 h-7 mb-1" />,
  motivation: <Zap className="w-7 h-7 mb-1" />,
  decision_driver: <Compass className="w-7 h-7 mb-1" />,
  financial_need_level: <PiggyBank className="w-7 h-7 mb-1" />,
  geographic_openness: <Earth className="w-7 h-7 mb-1" />,
  brand_affinity: <Megaphone className="w-7 h-7 mb-1" />,
  personality_orientation: <Puzzle className="w-7 h-7 mb-1" />,
};

const traitGradients: Record<string, string> = {
  goal: "linear-gradient(90deg, #595959 0%, #808F85 100%)",
  academic_strengths: "linear-gradient(90deg, #253C78 0%, #2B59C3 100%)",
  learning_style: "linear-gradient(90deg, #091E05 0%, #004F2D 100%)",
  motivation: "linear-gradient(90deg, #DBB3B1 0%, #C89FA3 100%)",
  decision_driver: "linear-gradient(90deg, #93A8AC 0%, #4C5760 100%)",
  financial_need_level: "linear-gradient(90deg, #33658A 0%, #86BBD8 100%)",
  geographic_openness: "linear-gradient(90deg, #8963BA 0%, #54428E 100%)",
  brand_affinity: "linear-gradient(90deg, #8C2F39 0%, #461220 100%)",
  personality_orientation: "linear-gradient(90deg, #FCAA67 0%, #B0413E 100%)",
};

function formatTrait(trait: string) {
  return trait.replace(/_/g, ' ').toUpperCase();
}

const ProfileCard: React.FC<ProfileCardProps> = ({ trait, label, loading = false }) => {
  const gradient = trait && traitGradients[trait];
  const skeletonClass = "bg-gray-200 dark:bg-gray-700";
  return (
    <Card className="!p-0 gap-0 overflow-hidden flex flex-col rounded-lg">
      {/* Top half: gradient background, icon above trait, Ask button top right */}
      <div
        className="flex-none min-h-12 flex items-center justify-center text-white text-lg font-bold rounded-t-lg relative p-3"
        style={gradient ? { background: gradient } : {}}
      >
        <span className="flex flex-col items-center justify-center w-full">
          {loading ? (
            <Skeleton className={`w-7 h-7 mb-1 rounded-full ${skeletonClass}`} />
          ) : (
            trait && traitIcons[trait]
          )}
          <span className="font-medium text-sm">
            {loading ? <Skeleton className={`w-20 h-4 mt-1 ${skeletonClass}`} /> : trait && formatTrait(trait)}
          </span>
        </span>
        <Button
          size="sm"
          className="absolute top-2 right-2 bg-white text-gray-700 hover:bg-gray-100 px-3 py-1 rounded-full shadow"
          disabled={loading}
        >
          {loading ? <Skeleton className={`w-8 h-4 ${skeletonClass}`} /> : "Ask"}
        </Button>
      </div>
      {/* Bottom half: label, full width, left-aligned, with padding */}
      <div className="flex-1 flex items-start bg-white text-gray-800 text-base rounded-b-lg w-full p-3">
        {loading ? <Skeleton className={`w-full h-5 ${skeletonClass}`} /> : label}
      </div>
    </Card>
  );
};

export default ProfileCard; 