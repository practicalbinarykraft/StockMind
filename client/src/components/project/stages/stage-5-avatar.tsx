import { useState } from "react"
import { type Project } from "@shared/schema"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Users, Search, CheckCircle2 } from "lucide-react"

interface Stage5Props {
  project: Project
  stepData: any
}

// Mock avatars
const MOCK_AVATARS = [
  { id: "a1", name: "Alex - Business Pro", type: "custom", imageUrl: "/placeholder-avatar.jpg" },
  { id: "a2", name: "Emma - News Anchor", type: "public", imageUrl: "/placeholder-avatar.jpg" },
  { id: "a3", name: "Michael - Tech Expert", type: "public", imageUrl: "/placeholder-avatar.jpg" },
  { id: "a4", name: "Sofia - Educator", type: "custom", imageUrl: "/placeholder-avatar.jpg" },
  { id: "a5", name: "David - Presenter", type: "public", imageUrl: "/placeholder-avatar.jpg" },
  { id: "a6", name: "Lisa - Corporate", type: "public", imageUrl: "/placeholder-avatar.jpg" },
]

export function Stage5AvatarSelection({ project }: Stage5Props) {
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  const filteredAvatars = MOCK_AVATARS.filter(avatar =>
    avatar.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleCreateVideo = async () => {
    if (!selectedAvatar) return
    setIsCreating(true)
    // Simulate video creation
    await new Promise(resolve => setTimeout(resolve, 3000))
    setIsCreating(false)
    console.log("Proceeding to Stage 6")
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Users className="h-8 w-8 text-chart-4" />
          <h1 className="text-3xl font-bold">Avatar Selection</h1>
        </div>
        <p className="text-lg text-muted-foreground">
          Choose an avatar to present your video
        </p>
      </div>

      <div className="space-y-6">
        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search avatars..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search-avatars"
              />
            </div>
          </CardContent>
        </Card>

        {/* Avatars Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAvatars.map(avatar => (
            <Card
              key={avatar.id}
              className={`cursor-pointer transition-all hover-elevate ${
                selectedAvatar === avatar.id ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => setSelectedAvatar(avatar.id)}
              data-testid={`card-avatar-${avatar.id}`}
            >
              <CardHeader>
                <div className="aspect-video bg-muted rounded-lg mb-3 flex items-center justify-center">
                  <Users className="h-16 w-16 text-muted-foreground" />
                </div>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{avatar.name}</CardTitle>
                  {selectedAvatar === avatar.id && (
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Badge variant={avatar.type === "custom" ? "default" : "secondary"}>
                  {avatar.type === "custom" ? "Your Avatar" : "Public"}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Action Buttons */}
        <Card>
          <CardContent className="pt-6">
            <Button
              size="lg"
              className="w-full gap-2"
              onClick={handleCreateVideo}
              disabled={!selectedAvatar || isCreating}
              data-testid="button-create-video"
            >
              {isCreating ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  Creating Video...
                </>
              ) : (
                <>
                  <Users className="h-5 w-5" />
                  Create Video with Selected Avatar
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
