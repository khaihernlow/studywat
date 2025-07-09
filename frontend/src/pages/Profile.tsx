import { useEffect, useState } from "react";
import { usePageTitle } from "@/contexts/PageTitleContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Rocket, Brain, BookOpen, Flame, HelpCircle } from "lucide-react";
import { getTraits } from "@/services/profileApi";
import ProfileCard from "../components/ProfileCard";

// Map trait to icon (as a function for dynamic props)
const traitIcons: Record<string, (props?: any) => React.ReactNode> = {
  goal: (props) => <Rocket {...props} />,
  academic_strengths: (props) => <Brain {...props} />,
  learning_style: (props) => <BookOpen {...props} />,
  motivation: (props) => <Flame {...props} />,
};

// Map trait to gradient class
const traitGradients: Record<string, string> = {
  goal: "bg-gradient-to-r from-[#0096C7] to-[#ADE8F4]", // blue
  academic_strengths: "bg-gradient-to-r from-[#3A5A40] to-[#DAD7CD]", // green
  motivation: "bg-gradient-to-r from-[#CC5803] to-[#FFB627]", // orange
  learning_style: "bg-gradient-to-r from-[#720026] to-[#CE4257]", // red-pink
  // fallback for other traits
  default: "bg-gradient-to-r from-[#4361EE] to-[#B9FBC0]", // purple to mint
};

export default function Profile() {
  const { setTitle } = usePageTitle();
  const [traits, setTraits] = useState<any[]>([]); // Start with empty array
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTitle('Profile');
    setLoading(true);
    getTraits()
      .then((data) => {
        setTraits(
          data.map((t: any) => ({
            trait: t.trait,
            label: t.label,
          }))
        );
        setLoading(false);
      })
      .catch((err) => {
        setTraits([]);
        setLoading(false);
      });
  }, [setTitle]);

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Profile</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 items-stretch">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <ProfileCard key={i} loading={true} />
              ))
            : traits.map((trait) => (
                <ProfileCard key={trait.trait} trait={trait.trait} label={trait.label} />
              ))}
        </div>
      </div>
    </div>
  );
}