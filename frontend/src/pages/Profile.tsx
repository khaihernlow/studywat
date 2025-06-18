import { useEffect } from "react";
import { usePageTitle } from "@/contexts/PageTitleContext";

export default function Profile() {
    const { setTitle } = usePageTitle();

    useEffect(() => {
      setTitle('Profile');
    }, [setTitle]);
  
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Profile Area</h1>
        <p className="text-muted-foreground">
          Your personality widgets and insights will be displayed here.
        </p>
      </div>
    );
}