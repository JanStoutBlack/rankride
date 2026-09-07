import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Car, MapPin, Clock, Shield, ArrowRight, Sparkles } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen gradient-mesh">
      {/* Floating decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      </div>

      {/* Header */}
      <header className="relative z-10 glass-subtle">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Car className="h-5 w-5 text-primary" />
            </div>
            <span className="font-semibold text-lg">TaxiRank</span>
          </div>
          <Link to="/auth">
            <Button variant="outline" className="rounded-xl">
              Sign In
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 container mx-auto px-4 pt-20 pb-32">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-subtle text-sm mb-8 animate-fade-in">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Smart taxi booking for South Africa</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            Your Ride,
            <br />
            <span className="text-gradient">Your Way</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-10 max-w-xl mx-auto animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Book taxi rides effortlessly from your nearest rank. 
            Fast, reliable, and always ready when you are.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <Link to="/auth">
              <Button size="lg" className="rounded-xl h-14 px-8 text-base glow-primary">
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button variant="outline" size="lg" className="rounded-xl h-14 px-8 text-base glass">
                I'm a Taxi Owner
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 container mx-auto px-4 pb-32">
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {[
            {
              icon: MapPin,
              title: 'Find Your Rank',
              description: 'Locate nearby taxi ranks and see available vehicles in real-time.',
              delay: '0.4s'
            },
            {
              icon: Clock,
              title: 'Book Instantly',
              description: 'Skip the queue with pre-booked seats. Get a digital ticket with QR code.',
              delay: '0.5s'
            },
            {
              icon: Shield,
              title: 'Safe & Secure',
              description: 'Verified drivers, tracked trips, and secure digital payments.',
              delay: '0.6s'
            }
          ].map((feature, index) => (
            <div 
              key={index}
              className="glass rounded-3xl p-8 hover-lift animate-fade-in"
              style={{ animationDelay: feature.delay }}
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <feature.icon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 container mx-auto px-4 pb-20">
        <div className="glass rounded-3xl p-12 md:p-16 text-center max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to ride?</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Join thousands of commuters who've made their daily travel easier with TaxiRank.
          </p>
          <Link to="/auth">
            <Button size="lg" className="rounded-xl h-14 px-10 text-base glow-primary">
              Create Free Account
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 glass-subtle py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2024 TaxiRank. Built for South African commuters.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
