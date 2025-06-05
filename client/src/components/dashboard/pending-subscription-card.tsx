import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { type UserSubscription, type Subscription } from "@shared/schema";

interface PendingSubscriptionCardProps {
  subscription: UserSubscription;
  subscriptionInfo?: Subscription;
}

export function PendingSubscriptionCard({
  subscription,
  subscriptionInfo,
}: PendingSubscriptionCardProps) {
  return (
    <Card className="border border-blue-100 bg-gradient-to-r from-blue-50 to-sky-50 shadow-sm mb-4 hover:shadow-md transition-all duration-300">
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4 md:px-5 border-b border-blue-100">
        <CardTitle className="text-sm md:text-base font-bold text-blue-700">
          Pending Subscription
        </CardTitle>
        <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 text-xs md:text-sm px-2 py-1">
          <i className="ri-time-line mr-1.5"></i>
          In Queue
        </Badge>
      </CardHeader>
      <CardContent className="p-4 md:p-5">
        <div className="flex flex-col justify-between">
          <div>
            {/* Hide plan details until payment is verified */}
            {subscription.paymentVerified ? (
              <>
                <h4 className="font-bold text-base md:text-lg text-blue-800">
                  {subscriptionInfo?.name || "Subscription Plan"}
                </h4>
                <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-3">
                  <div className="flex items-center text-xs md:text-sm bg-blue-50 px-2 py-1 rounded-full">
                    <i className="ri-coin-line mr-1.5 text-yellow-500"></i>
                    <span className="text-blue-700 font-medium">{subscriptionInfo?.leadCoins || subscription.leadCoinsLeft} LeadCoins</span>
                  </div>
                  <div className="flex items-center text-xs md:text-sm bg-blue-50 px-2 py-1 rounded-full">
                    <i className="ri-calendar-line mr-1.5 text-blue-500"></i>
                    <span className="text-blue-700 font-medium">
                      {subscriptionInfo?.durationDays || "Unknown"} days
                    </span>
                  </div>
                  <div className="flex items-center text-xs md:text-sm bg-blue-50 px-2 py-1 rounded-full">
                    <i className="ri-price-tag-3-line mr-1.5 text-green-500"></i>
                    <span className="text-blue-700 font-medium">
                      ${subscriptionInfo?.price || 0}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-4 bg-blue-50 rounded-md mb-4">
                <p className="text-center text-blue-700 font-medium">
                  Plan details will be displayed after payment is completed
                </p>
              </div>
            )}
            
            <div className="mt-4 p-3 bg-blue-100 rounded-md border border-blue-200">
              <div className="flex items-start">
                <i className="ri-information-line mr-2 text-blue-700 text-lg mt-0.5"></i>
                <div>
                  <p className="text-xs md:text-sm text-blue-800 font-bold">
                    {subscription.paymentVerified ? "Payment Received" : "Awaiting Payment Verification"}
                  </p>
                  <p className="text-xs md:text-sm text-blue-700 mt-1">
                    {subscription.paymentVerified 
                      ? "Your payment has been received and is being processed. Your subscription will be activated shortly."
                      : "Your subscription will be activated once payment is verified. This may take a few minutes."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}