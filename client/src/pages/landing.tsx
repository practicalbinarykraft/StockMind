import { Button } from "@/shared/ui/button"
import { Card, CardContent } from "@/shared/ui/card"
import { 
  Video, 
  Sparkles, 
  Newspaper, 
  Mic, 
  Users,
  ArrowRight,
  CheckCircle2
} from "lucide-react"

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-chart-5/10" />
        
        <div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
              Transform News into
              <span className="block text-primary">Viral Video Content</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              AI-powered video production pipeline that turns news articles into engaging short-form videos with automated analysis, voiceover, and avatars.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Button 
                size="lg"
                onClick={() => window.location.href = '/login'}
                className="gap-2"
                data-testid="button-get-started"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Complete Video Production Pipeline
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Seven-stage workflow designed for professional content creators
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="border-border">
            <CardContent className="p-6">
              <Newspaper className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Smart RSS Parsing</h3>
              <p className="text-sm text-muted-foreground">
                Automatically parse news sources and get AI virality scores (0-100) for each article.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-6">
              <Sparkles className="h-10 w-10 text-chart-5 mb-4" />
              <h3 className="text-lg font-semibold mb-2">AI Script Analysis</h3>
              <p className="text-sm text-muted-foreground">
                15 format templates, scene-by-scene breakdown with scores, and 3 rewrite variants per scene.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-6">
              <Mic className="h-10 w-10 text-chart-2 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Voice Generation</h3>
              <p className="text-sm text-muted-foreground">
                ElevenLabs integration for professional voiceovers with audio preview and editing.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-6">
              <Users className="h-10 w-10 text-chart-4 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Avatar Selection</h3>
              <p className="text-sm text-muted-foreground">
                HeyGen avatar integration with custom and public avatar options.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-6">
              <Video className="h-10 w-10 text-chart-3 mb-4" />
              <h3 className="text-lg font-semibold mb-2">B-Roll Footage</h3>
              <p className="text-sm text-muted-foreground">
                Optional Kie.ai integration for automated storyboard and footage generation.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-6">
              <CheckCircle2 className="h-10 w-10 text-chart-1 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Export & Share</h3>
              <p className="text-sm text-muted-foreground">
                Download final videos with comprehensive summaries and sharing capabilities.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 7-Stage Pipeline */}
      <div className="bg-muted/30 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              7-Stage Production Workflow
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              From source selection to final export
            </p>
          </div>

          <div className="space-y-4 max-w-3xl mx-auto">
            {[
              { stage: 1, title: "Source Selection", desc: "Choose from News, Custom Script, or other sources" },
              { stage: 2, title: "Content Input", desc: "Browse news feed or enter custom text" },
              { stage: 3, title: "AI Analysis", desc: "Format templates, scene breakdown, scores & rewrites" },
              { stage: 4, title: "Voice Generation", desc: "Professional voiceovers with ElevenLabs" },
              { stage: 5, title: "Avatar Selection", desc: "Choose from HeyGen avatars" },
              { stage: 6, title: "Final Export", desc: "Download and share your video" },
              { stage: 7, title: "Storyboard (Optional)", desc: "Add B-roll footage with Kie.ai" },
            ].map((item) => (
              <Card key={item.stage} className="border-border">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                    {item.stage}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Ready to Transform Your Content?
          </h2>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            Start creating professional video content from news sources in minutes.
          </p>
          <div className="mt-10">
            <Button 
              size="lg"
              onClick={() => window.location.href = '/login'}
              className="gap-2"
              data-testid="button-cta-login"
            >
              Start Free
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
