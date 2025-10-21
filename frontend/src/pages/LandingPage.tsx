import { Sparkles } from "lucide-react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import vialingLogo from "@/assets/vialing-logo.png";
import landingCover from "@/assets/landing_cover.png";
import { Link } from "react-router-dom";
import { useEffect } from "react";
import { usePageTitle } from '@/contexts/PageTitleContext';

const LandingPage = () => {
  const { setTitle } = usePageTitle();
  useEffect(() => {
    setTitle('Discover your Path');
  }, [setTitle]);
  return (
    <>
      <section className="pt-20 min-h-screen flex justify-center">
        <div className="container px-4">
          <div className="z-10 mx-auto flex max-w-4xl flex-col items-center gap-14 text-center">
            <div className="flex flex-col items-center gap-4">
                <img src={vialingLogo} alt="Vialing Logo" className="h-14 rounded-full" />
                <div className="text-lg font-semibold text-muted-foreground">Studywat by Vialing</div>
            </div>
            <div>
              <h1 className="mb-4 text-3xl font-normal text-pretty lg:text-6xl/17">
                  Let AI help you choose the right University Pathway
              </h1>
              <p className="mx-auto max-w-xl text-muted-foreground">
                  Studywat combines psychology and AI to help students find the right academic paths based on personality, interest, and other insights.
              </p>
            </div>
            <div className="flex w-full flex-col items-center justify-center gap-6 lg:flex-row">
              <Button
                asChild
                size="lg"
                className="w-full sm:w-fit bg-gradient-to-r from-fuchsia-800 to-fuchsia-950 transition-colors transition-[background-position] duration-500 bg-[length:200%_200%] bg-[position:0%_50%] hover:bg-[position:100%_50%]"
              >
                <Link to="/login">
                  <Sparkles className="mr-2 h-4" />
                  Get Matched to a Program
                </Link>
              </Button>
              <div className="flex flex-col items-center gap-2 lg:items-start">
                <span className="inline-flex items-center -space-x-1">
                  <Avatar className="size-7 border bg-white">
                    <AvatarImage
                      src="https://sureworks.info/__file/peninsula.jpeg?ulid=01HJNQ2F8673W040JQAQXDFNC9&md"
                      alt="Peninsula College"
                    />
                  </Avatar>
                  <Avatar className="size-7 border bg-white">
                    <AvatarImage
                      src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Xiamen_University_logo.svg/1200px-Xiamen_University_logo.svg.png"
                      alt="Xiamen University Malaysia"
                    />
                  </Avatar>
                  <Avatar className="size-7 border bg-white">
                    <AvatarImage
                      src="https://media.licdn.com/dms/image/v2/C510BAQGaZ5xi0o797A/company-logo_200_200/company-logo_200_200/0/1630608532763/german_malaysian_institute_logo?e=2147483647&v=beta&t=0M5V4f6QFoW-iTqUKVL3OzHWCNicwKrb4z-h4oLTk40"
                      alt="GMI"
                    />
                  </Avatar>
                  <Avatar className="size-7 border bg-white">
                    <AvatarImage
                      src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT6EyBtyINpy2PnmOGXIEv4OD-dQWpi-B_x1w&s"
                      alt="Micost Melaka"
                    />
                  </Avatar>
                </span>
                <p className="text-xs text-muted-foreground">
                  Trusted by our University Partners
                </p>
              </div>
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-4">
            <img
              src={landingCover}
              alt="Landing Cover"
              className="mt-10 sm:mt-24 aspect-video max-h-[700px] w-full rounded-t-lg object-cover shadow-md"
            />
            <div className="flex flex-row flex-wrap gap-6 text-muted-foreground text-xs sm:text-sm items-center mb-10 mt-15">
              <a href="https://vialing.com/terms-of-use/" target="_blank" rel="noopener noreferrer" className="hover:text-primary">Terms of Service</a>
              <a href="https://vialing.com/privacy-notice/" target="_blank" rel="noopener noreferrer" className="hover:text-primary">Privacy Policy</a>
              <span>Built with ♡ for our students.</span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default LandingPage; 