import { useEffect, useState } from "react";
import { usePageTitle } from "@/contexts/PageTitleContext";
import { getTraits } from "@/services/profileApi";
import ProfileCard from "../components/ProfileCard";

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
      .catch(() => {
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