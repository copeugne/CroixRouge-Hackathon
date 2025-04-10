"use client"

import { useState, useEffect } from "react"
import React from "react"
import Link from "next/link"
import { ArrowLeft, Award, Brain, ChevronLeft, ChevronRight, Clock, Dices, 
  Hourglass, Info, ListTodo, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react"

import { Button } from "~/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "~/components/ui/card"
import { Progress } from "~/components/ui/progress"
import { useToast } from "~/hooks/use-toast"
import { Badge } from "~/components/ui/badge"
import { Separator } from "~/components/ui/separator"
import { api } from "~/trpc/react"
import Image from "next/image"

export default function StudyDeckPage({ params }: { params: Promise<{ deck: string }> }) {
  // Unwrap params using React.use()
  const resolvedParams = React.use(params);
  const deckId = resolvedParams.deck;
  
  const { toast } = useToast()
  const [flipped, setFlipped] = useState(false)
  const [currentCard, setCurrentCard] = useState(0)
  const [studyStats, setStudyStats] = useState({
    easyCards: 0,
    hardCards: 0,
    totalReviewed: 0,
    studyStartTime: Date.now(),
  })
  const [showConfetti, setShowConfetti] = useState(false)
  const [studyDuration, setStudyDuration] = useState(0)
  const [cards, setCards] = useState<Array<any>>([])
  
  // Fetch deck information
  const { data: deck, isLoading: deckLoading } = api.flashcard.getDeckById.useQuery({
    id: deckId
  })

  // Fetch due cards or all cards from this deck
  const { data: dueCards, isLoading: cardsLoading } = api.flashcard.getFlashcards.useQuery({
    deckId: deckId
  })
  
  // Record study results
  const recordStudyResult = api.flashcard.recordStudyResult.useMutation({
    onSuccess: () => {
      // Success handled in the card rating function
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save your progress",
        variant: "destructive"
      })
    }
  })
  
  // Set up cards once data is loaded
  useEffect(() => {
    if (dueCards && dueCards.length > 0) {
      setCards(dueCards)
    }
  }, [dueCards])

  // Update the duration every second
  useEffect(() => {
    const timer = setInterval(() => {
      setStudyDuration(Math.floor((Date.now() - studyStats.studyStartTime) / 1000));
    }, 1000);
    
    return () => clearInterval(timer);
  }, [studyStats.studyStartTime]);
  
  // Add keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setFlipped(!flipped);
      } else if (e.key === 'ArrowRight' && !flipped && currentCard < totalCards - 1) {
        handleNext();
      } else if (e.key === 'ArrowLeft' && !flipped && currentCard > 0) {
        handlePrevious();
      } else if (e.key === '1' && flipped) {
        handleCardRating(1);
      } else if (e.key === '2' && flipped) {
        handleCardRating(2);
      } else if (e.key === '3' && flipped) {
        handleCardRating(3);
      } else if (e.key === '4' && flipped) {
        handleCardRating(4);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [flipped, currentCard, cards]);

  // Show confetti effect on deck completion
  useEffect(() => {
    if (showConfetti) {
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [showConfetti]);

  // Calculate total cards
  const totalCards = cards.length;
  const progress = totalCards ? ((currentCard + 1) / totalCards) * 100 : 0;
  
  // Calculate study statistics
  const accuracy = studyStats.totalReviewed > 0 
    ? Math.round((studyStats.easyCards / studyStats.totalReviewed) * 100) 
    : 0;
  
  // Format study duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFlip = () => {
    setFlipped(!flipped)
    
    if (!flipped) {
      // Only show toast when revealing the answer
      toast({
        title: "Card flipped",
        description: "Take your time to review the answer",
        variant: "info",
      })
    }
  }

  const handleCardRating = (rating: 1 | 2 | 3 | 4) => {
    if (!cards[currentCard]) return;
    
    // Update study statistics
    const isEasy = rating >= 3;
    const newStats = {
      ...studyStats,
      easyCards: isEasy ? studyStats.easyCards + 1 : studyStats.easyCards,
      hardCards: !isEasy ? studyStats.hardCards + 1 : studyStats.hardCards,
      totalReviewed: studyStats.totalReviewed + 1,
    }
    setStudyStats(newStats)

    // Show rating toast with different messages based on rating
    const messages = {
      1: "This was hard! We'll show it more often.",
      2: "Got it, but needs more review.",
      3: "Good job! Getting better at this one.",
      4: "Perfect! You've mastered this card."
    };
    
    toast({
      title: isEasy ? "Marked as Known" : "Marked for Review",
      description: messages[rating],
      variant: isEasy ? "success" : "warning",
    })
    
    // Record the study result in the database
    recordStudyResult.mutate({
      flashcardId: cards[currentCard].id,
      rating: rating
    })

    // Automatically move to the next card if available
    if (currentCard < totalCards - 1) {
      handleNext()
    } else {
      // Show completion celebration
      setShowConfetti(true);
      
      // Replace toast sequence
      toast({
        title: "Saving progress",
        description: "Updating your study statistics...",
        variant: "info",
      })
      
      // Simulate saving progress
      setTimeout(() => {
        toast({
          title: "Deck completed! 🎉",
          description: `You've reviewed all ${totalCards} cards. ${newStats.easyCards} marked as known, ${newStats.hardCards} marked for review.`,
          variant: "success",
        })
      }, 1000)
    }
  }

  const handleNext = () => {
    if (currentCard < totalCards - 1) {
      setCurrentCard(currentCard + 1)
      setFlipped(false)
      
      // If we're at the second-to-last card, show approaching end toast
      if (currentCard === totalCards - 2) {
        toast({
          title: "Last card approaching",
          description: "You're about to review the final card in this deck",
          variant: "info",
        })
      }
    }
  }

  const handlePrevious = () => {
    if (currentCard > 0) {
      setCurrentCard(currentCard - 1)
      setFlipped(false)
    }
  }

  // Show a milestone toast when reaching halfway
  const checkMilestone = (cardIndex: number) => {
    if (cardIndex === Math.floor(totalCards / 2) - 1) {
      toast({
        title: "Halfway there!",
        description: `You've completed ${Math.round(50)}% of this deck. Keep going!`,
        variant: "success",
      })
    }
  }

  // Get difficulty badge based on card ease factor
  const getDifficultyBadge = () => {
    if (!deck) return <Badge variant="outline" className="bg-green-500/20 text-green-600 dark:bg-green-700/30 dark:text-green-400 border-green-300">Loading...</Badge>
    
    const cardCount = cards.length;
    if (cardCount > 30) {
      return <Badge variant="outline" className="bg-amber-500/20 text-amber-700 dark:bg-amber-700/30 dark:text-amber-400 border-amber-300">Large Deck</Badge>
    } else if (cardCount > 10) {
      return <Badge variant="outline" className="bg-amber-500/20 text-amber-700 dark:bg-amber-700/30 dark:text-amber-400 border-amber-300">Medium</Badge>
    } else {
      return <Badge variant="outline" className="bg-green-500/20 text-green-600 dark:bg-green-700/30 dark:text-green-400 border-green-300">Small Deck</Badge>
    }
  }

  // Show loading state when data is being fetched
  if (deckLoading || cardsLoading) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin h-12 w-12 rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-lg font-medium">Loading flashcards...</p>
        </div>
      </div>
    );
  }
  
  // Show empty state if there are no cards
  if (!cards.length) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-b from-background to-secondary/10">
        <header className="bg-gradient-to-r from-primary/10 via-background to-primary/10 border-b">
          <div className="container mx-auto py-4">
            <div className="flex items-center">
              <Button variant="ghost" size="icon" asChild className="mr-3">
                <Link href="/flashcards">
                  <ArrowLeft className="h-5 w-5" />
                  <span className="sr-only">Back to decks</span>
                </Link>
              </Button>
              <h1 className="text-2xl font-bold">{deck?.name || "Deck"}</h1>
            </div>
          </div>
        </header>
        <main className="flex-1 container mx-auto p-6 flex flex-col items-center justify-center">
          <Card className="max-w-md w-full">
            <CardHeader>
              <h2 className="text-xl font-bold text-center">No Cards to Study</h2>
            </CardHeader>
            <CardContent className="text-center">
              <p className="mb-6">There are no cards in this deck yet, or all cards have been reviewed.</p>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button asChild className="w-full">
                <Link href={`/flashcards/manage/${deckId}`}>Manage Deck</Link>
              </Button>
              <Button variant="outline" asChild className="w-full">
                <Link href="/flashcards">Back to Decks</Link>
              </Button>
            </CardFooter>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-background via-background to-secondary/10">
      {showConfetti && (
        <div className="confetti-container fixed inset-0 z-50 pointer-events-none">
          {[...Array(50)].map((_, i) => (
            <div 
              key={i} 
              className="confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-5%`,
                backgroundColor: `hsl(${Math.random() * 360}, 100%, 50%)`,
                width: `${Math.random() * 10 + 5}px`,
                height: `${Math.random() * 10 + 5}px`,
                animation: `fall ${Math.random() * 3 + 2}s linear forwards, sway ${Math.random() * 4 + 3}s ease-in-out infinite alternate`
              }}
            />
          ))}
        </div>
      )}

      {/* Refined Header with improved design */}
      <header className="bg-gradient-to-r from-primary/10 via-background to-primary/10 border-b sticky top-0 z-10 backdrop-blur-sm">
        <div className="container mx-auto py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Button variant="ghost" size="icon" asChild className="mr-3 hover:bg-primary/10 rounded-full transition-colors">
                <Link href="/flashcards">
                  <ArrowLeft className="h-5 w-5" />
                  <span className="sr-only">Back to decks</span>
                </Link>
              </Button>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                    {deck?.name || "Loading..."}
                  </h1>
                  {getDifficultyBadge()}
                </div>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1">
                    <Dices className="h-3.5 w-3.5 text-primary/70" />
                    Card {currentCard + 1} of {totalCards}
                  </span>
                  <span className="inline-block mx-1.5 w-1 h-1 rounded-full bg-muted-foreground/30"></span>
                  <span>{Math.round(progress)}% complete</span>
                </p>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-5 text-sm">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary/40">
                <Clock className="h-4 w-4 text-primary/70" />
                <span className="font-medium">{formatDuration(studyDuration)}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary/40">
                <Brain className="h-4 w-4 text-primary/70" />
                <span className="font-medium">{studyStats.totalReviewed} reviewed</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary/40">
                <Award className="h-4 w-4 text-amber-500" />
                <span className="font-medium">{accuracy}% accuracy</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Enhanced study area with improved layout */}
      <main className="flex-1 container mx-auto p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-4xl space-y-8">
          {/* Enhanced progress tracking with better visuals */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="space-y-2.5 bg-card p-5 rounded-xl border shadow-md hover:shadow-lg transition-shadow dark:bg-card/80 dark:backdrop-blur-sm">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold flex items-center gap-2">
                  <ListTodo className="h-4 w-4 text-primary" />
                  Study Progress
                </span>
                <span className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-amber-600">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2.5 rounded-full" 
                style={{background: "linear-gradient(to right, #22c55e 0%, #eab308 50%, #ef4444 100%)"}}
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                {totalCards - (currentCard + 1) > 0 ? (
                  <>
                    <Info className="h-3.5 w-3.5 text-primary/60" />
                    <span>{totalCards - (currentCard + 1)} cards remaining</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-amber-600 dark:text-amber-400 font-medium">Last card!</span>
                  </>
                )}
              </p>
            </div>
            
            <div className="space-y-2.5 bg-card p-5 rounded-xl border shadow-md hover:shadow-lg transition-shadow dark:bg-card/80 dark:backdrop-blur-sm">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold flex items-center gap-2">
                  <ThumbsUp className="h-4 w-4 text-green-500" /> 
                  Easy Cards
                </span>
                <span className="text-sm font-bold text-green-600">{studyStats.easyCards}</span>
              </div>
              <Progress value={(studyStats.easyCards / Math.max(1, studyStats.totalReviewed)) * 100} 
                className="h-2.5 rounded-full bg-muted" 
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                {studyStats.totalReviewed > 0 ? (
                  <>
                    <Info className="h-3.5 w-3.5 text-primary/60" />
                    <span>{Math.round((studyStats.easyCards / studyStats.totalReviewed) * 100)}% success rate</span>
                  </>
                ) : (
                  <>
                    <Info className="h-3.5 w-3.5 text-primary/60" />
                    <span>No cards reviewed yet</span>
                  </>
                )}
              </p>
            </div>
            
            <div className="space-y-2.5 bg-card p-5 rounded-xl border shadow-md hover:shadow-lg transition-shadow dark:bg-card/80 dark:backdrop-blur-sm">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold flex items-center gap-2">
                  <Hourglass className="h-4 w-4 text-primary" /> 
                  Study Time
                </span>
                <span className="text-sm font-bold">{formatDuration(studyDuration)}</span>
              </div>
              <div className="flex justify-between items-center gap-2 mt-2.5">
                <span className="text-xs text-muted-foreground">Avg. per card:</span>
                <span className="text-xs font-medium bg-secondary/40 px-2.5 py-1 rounded-md">
                  {studyStats.totalReviewed > 0 
                    ? formatDuration(Math.floor(studyDuration / studyStats.totalReviewed)) 
                    : "0:00"}
                </span>
              </div>
            </div>
          </div>

          {/* Enhanced flashcard with improved animations and design */}
          <div className={`perspective-1000 w-full transition-all duration-300 ${flipped ? "scale-[1.02]" : ""}`}>
            <Card
              className={`
                w-full min-h-[350px] sm:min-h-[400px] md:min-h-[450px] 
                cursor-pointer transition-all duration-500 transform-style-3d relative
                hover:shadow-2xl rounded-2xl border-2 ${flipped 
                  ? "border-primary/40 shadow-lg shadow-primary/5" 
                  : "border-border hover:border-primary/20"}
                bg-gradient-to-br from-card to-card/95 overflow-hidden
              `}
              onClick={handleFlip}
            >
              {/* Abstract pattern decoration */}
              <div className="absolute inset-0 opacity-5 pointer-events-none overflow-hidden">
                {[...Array(8)].map((_, i) => (
                  <div 
                    key={i}
                    className="absolute rounded-full bg-primary/30 blur-3xl"
                    style={{
                      width: `${Math.random() * 200 + 100}px`,
                      height: `${Math.random() * 200 + 100}px`,
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      opacity: Math.random() * 0.5 + 0.25,
                      transform: `translate(-50%, -50%)`
                    }}
                  />
                ))}
              </div>

              {/* Front of card (Question) */}
              <div
                className={`absolute inset-0 w-full h-full flex flex-col backface-hidden transition-all duration-500 ${
                  flipped ? "rotate-y-180 opacity-0" : "rotate-y-0 opacity-100"
                }`}
                style={{
                  backfaceVisibility: "hidden",
                  transformStyle: "preserve-3d"
                }}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <Dices className="h-4 w-4 text-primary" />
                      </div>
                      <div className="text-sm font-medium text-primary">Question</div>
                    </div>
                    <div className="text-xs px-3.5 py-1.5 rounded-full bg-primary/10 text-primary font-medium flex items-center gap-1.5">
                      <Info className="h-3.5 w-3.5" />
                      Card {currentCard + 1} of {totalCards}
                    </div>
                  </div>
                  <div className="text-2xl font-extrabold tracking-tight text-foreground mt-4 pb-2 border-b">
                    {cards[currentCard]?.title || "Question"}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col items-center justify-center p-6 space-y-4">
                  {cards[currentCard]?.imageUrl && (
                    <div className="relative w-full max-w-xs h-40 rounded-lg overflow-hidden mb-4">
                      <img 
                        src={cards[currentCard].imageUrl} 
                        alt="Flashcard illustration" 
                        className="object-contain w-full h-full"
                      />
                    </div>
                  )}
                  <div className="text-lg sm:text-xl font-medium text-center max-w-2xl">
                    {cards[currentCard]?.question || "Loading..."}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-center pb-8 opacity-70">
                  <Button
                    variant="outline"
                    className="group relative overflow-hidden border-primary/30 text-primary hover:text-primary-foreground transition-colors"
                  >
                    <span className="relative z-10">Tap to Reveal Answer</span>
                    <span className="absolute inset-0 bg-primary transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></span>
                  </Button>
                </CardFooter>
                {/* Keyboard hints with improved styling */}
                <div className="absolute bottom-3 right-3 flex gap-2">
                  <kbd className="text-xs border rounded-md px-2 py-0.5 bg-muted/50 shadow-sm">Space</kbd>
                </div>
              </div>

              {/* Back of card (Answer) with enhanced design */}
              <div
                className={`absolute inset-0 w-full h-full flex flex-col backface-hidden transition-all duration-500 ${
                  flipped ? "rotate-y-0 opacity-100" : "rotate-y-180 opacity-0"
                }`}
                style={{
                  backfaceVisibility: "hidden",
                  transformStyle: "preserve-3d"
                }}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
                        <Award className="h-4 w-4 text-green-500" />
                      </div>
                      <div className="text-sm font-medium text-green-600">Answer</div>
                    </div>
                    <div className="text-xs px-3.5 py-1.5 rounded-full bg-green-500/10 text-green-600 font-medium flex items-center gap-1.5">
                      <Info className="h-3.5 w-3.5" />
                      Card {currentCard + 1} of {totalCards}
                    </div>
                  </div>
                  <div className="text-2xl font-extrabold tracking-tight text-foreground mt-4 pb-2 border-b">
                    {cards[currentCard]?.title || "Answer"}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col items-center justify-center p-6 space-y-4">
                  {cards[currentCard]?.imageUrl && (
                    <div className="relative w-full max-w-xs h-40 rounded-lg overflow-hidden mb-4">
                      <img 
                        src={cards[currentCard].imageUrl} 
                        alt="Flashcard illustration" 
                        className="object-contain w-full h-full"
                      />
                    </div>
                  )}
                  <div className="text-lg sm:text-xl font-medium text-center leading-relaxed max-w-2xl">
                    {cards[currentCard]?.answer || "Loading..."}
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col sm:flex-row justify-center gap-4 pb-8">
                  <div className="grid grid-cols-2 gap-3 w-full max-w-md">
                    <Button
                      variant="outline"
                      className="gap-2 border-red-300 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 transition-colors group"
                      onClick={() => handleCardRating(1)}
                    >
                      <ThumbsDown className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                      <span>Hard</span>
                      <span className="text-xs opacity-70 ml-1 bg-muted/50 px-1.5 rounded">1</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2 border-amber-300 text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950/50 transition-colors group"
                      onClick={() => handleCardRating(2)}
                    >
                      <span>Good</span>
                      <span className="text-xs opacity-70 ml-1 bg-muted/50 px-1.5 rounded">2</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2 border-green-300 text-green-600 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-950/50 transition-colors group"
                      onClick={() => handleCardRating(3)}
                    >
                      <span>Easy</span>
                      <span className="text-xs opacity-70 ml-1 bg-muted/50 px-1.5 rounded">3</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2 border-emerald-300 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/50 transition-colors group"
                      onClick={() => handleCardRating(4)}
                    >
                      <ThumbsUp className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                      <span>Perfect</span>
                      <span className="text-xs opacity-70 ml-1 bg-muted/50 px-1.5 rounded">4</span>
                    </Button>
                  </div>
                </CardFooter>
                {/* Keyboard hints with improved styling */}
                <div className="absolute bottom-3 right-3 flex gap-2">
                  <kbd className="text-xs border rounded-md px-2 py-0.5 bg-muted/50 shadow-sm">1-4</kbd>
                </div>
              </div>
            </Card>
          </div>

          {/* Enhanced navigation buttons */}
          <div className="flex justify-between mt-10 items-center">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentCard === 0}
              className="px-5 py-2.5 h-auto transition-all duration-200 hover:translate-x-[-2px] disabled:opacity-50 rounded-xl border shadow-sm"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
              <span className="text-xs opacity-70 ml-1.5 hidden sm:inline bg-muted/50 px-1.5 rounded">←</span>
            </Button>
            
            <div className="text-center hidden md:block">
              <span className="text-sm font-medium bg-secondary/40 px-4 py-2 rounded-full">
                Card {currentCard + 1} of {totalCards}
              </span>
            </div>
            
            <Button
              onClick={() => {
                handleNext();
                checkMilestone(currentCard + 1);
              }}
              disabled={currentCard === totalCards - 1}
              className="px-5 py-2.5 h-auto bg-primary hover:bg-primary/90 transition-all duration-200 hover:translate-x-[2px] disabled:opacity-50 rounded-xl shadow-sm"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="ml-2 h-4 w-4" />
              <span className="text-xs opacity-70 ml-1.5 hidden sm:inline bg-primary-foreground/20 px-1.5 rounded">→</span>
            </Button>
          </div>
          
          {/* Keyboard shortcuts guide with improved design */}
          <div className="text-xs text-center text-muted-foreground mt-6 hidden sm:block bg-muted/30 py-3 px-4 rounded-xl">
            <p className="flex items-center justify-center gap-2 flex-wrap">
              <span>Keyboard shortcuts:</span>
              <span className="flex items-center gap-1">
                <kbd className="px-2 py-0.5 rounded-md border shadow-sm mx-1 bg-background">Space</kbd>
                <span>to flip card</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-2 py-0.5 rounded-md border shadow-sm mx-1 bg-background">←</kbd>
                <span>previous card</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-2 py-0.5 rounded-md border shadow-sm mx-1 bg-background">→</kbd>
                <span>next card</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-2 py-0.5 rounded-md border shadow-sm mx-1 bg-background">1-4</kbd>
                <span>rate difficulty</span>
              </span>
            </p>
          </div>
        </div>
      </main>

      <style jsx global>{`
        @keyframes fall {
          0% {
            transform: translateY(-10vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }

        @keyframes sway {
          0% {
            transform: translateX(-10px);
          }
          100% {
            transform: translateX(10px);
          }
        }

        .confetti {
          position: absolute;
          border-radius: 50%;
          opacity: 0.7;
        }

        .perspective-1000 {
          perspective: 1000px;
        }

        .transform-style-3d {
          transform-style: preserve-3d;
        }

        .backface-hidden {
          backface-visibility: hidden;
        }

        .rotate-y-0 {
          transform: rotateY(0deg);
        }

        .rotate-y-180 {
          transform: rotateY(180deg);
        }

        @media (prefers-reduced-motion: reduce) {
          .confetti {
            animation: none !important;
          }
          
          .backface-hidden {
            transition-duration: 0.1s !important;
          }
        }
      `}</style>
    </div>
  )
}
