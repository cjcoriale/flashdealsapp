import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Clock, Tag, Star } from "lucide-react";
import SignupModal from "@/components/SignupModal";

export default function Landing() {
  const [showSignupModal, setShowSignupModal] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
            FlashDeals
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Discover amazing local deals on an interactive map. Find restaurants, shops, and services offering limited-time discounts in your area.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={() => setShowSignupModal(true)} 
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
            >
              Get Started
            </Button>
            <Button 
              onClick={() => window.location.href = '/api/login'}
              size="lg"
              variant="outline"
              className="border-blue-600 text-blue-600 hover:bg-blue-50 px-8 py-3 text-lg"
            >
              Sign In
            </Button>
          </div>
        </div>

        <SignupModal 
          isOpen={showSignupModal} 
          onClose={() => setShowSignupModal(false)} 
        />

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <Card className="text-center">
            <CardHeader>
              <MapPin className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <CardTitle>Location-Based</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Find deals near you with our interactive map and GPS integration
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Clock className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <CardTitle>Real-Time Updates</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Get instant notifications about new deals and limited-time offers
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Tag className="w-12 h-12 text-purple-600 mx-auto mb-4" />
              <CardTitle>Exclusive Discounts</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Access special deals and flash sales only available through our platform
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Star className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
              <CardTitle>Save Favorites</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Save deals you love and get notifications when similar offers are available
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">Sign In</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Create your account and set your location preferences
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">Explore</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Browse deals on the interactive map or search by category
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">Claim & Save</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Claim deals you want and save money at local businesses
              </p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <Card className="max-w-2xl mx-auto bg-blue-600 text-white">
            <CardHeader>
              <CardTitle className="text-2xl">Ready to Start Saving?</CardTitle>
              <CardDescription className="text-blue-100">
                Join thousands of users who are already discovering amazing local deals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => window.location.href = '/api/login'} 
                variant="secondary"
                size="lg"
              >
                Sign In Now
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}