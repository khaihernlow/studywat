import { useEffect, useState } from "react";
import { usePageTitle } from "@/contexts/PageTitleContext";
import { useProfileApi } from "@/services/profileApi";
import ProfileCard from "../components/ProfileCard";
import CourseSuggestions from "../components/CourseSuggestions";

export default function Profile() {
  const { setTitle } = usePageTitle();
  const [traits, setTraits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { getTraits } = useProfileApi();

  useEffect(() => {
    setTitle('Profile');
    setLoading(true);
    getTraits()
      .then((data) => {
        setTraits(
          data.map((t: any) => ({
            trait: t.trait,
            label: t.label,
            label_description: t.label_description,
          }))
        );
        setLoading(false);
      })
      .catch(() => {
        setTraits([]);
        setLoading(false);
      });
  }, [setTitle, getTraits]);

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">About Me</h1>
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Suggested Courses to Study</h2>
          <CourseSuggestions />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 items-stretch">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <ProfileCard key={i} loading={true} />
              ))
            : traits.map((trait) => (
                <ProfileCard key={trait.trait} trait={trait.trait} label={trait.label} label_description={trait.label_description} />
              ))}
        </div>
      </div>
    </div>
  );
}