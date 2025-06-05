              try {
                if (userId && subscriptionId) {
                  // Get user subscription by session ID
                  const userSubscription =
                    await storage.getUserSubscriptionByPaymentSession(session.id);

                  if (userSubscription) {
                    console.log(
                      `Found user subscription with ID ${userSubscription.id}`,
                    );

                    // Make sure it's not already activated
                    if (
                      userSubscription.status === "active" &&
                      userSubscription.paymentVerified
                    ) {
                      console.log(
                        `Subscription ${userSubscription.id} is already active and verified, skipping update`,
                      );
                      return res
                        .status(200)
                        .json({ received: true, status: "already_active" });
                    }

                    // Update user subscription status
                    const updatedSubscription =
                      await storage.updateUserSubscription(userSubscription.id, {
                        status: "active",
                        paymentVerified: true,
                      });

                    console.log(
                      `Updated subscription status to active:`,
                      updatedSubscription,
                    );

                    // Update user's lead coins based on subscription
                    await storage.updateUserLeadCoins(
                      userSubscription.userId,
                      userSubscription.leadCoinsLeft,
                    );

                    console.log(
                      `Updated user's lead coins by ${userSubscription.leadCoinsLeft}`,
                    );
                  } else {
                    console.log(
                      `No user subscription found with session ID ${session.id}`,
                    );

                    // Get the user's subscription history
                    const userSubscriptionHistory = await storage.getUserSubscriptionHistory(userId);
                    
                    // Look for any pending subscription for this plan
                    const pendingSubscription = userSubscriptionHistory.find(
                      sub => sub.subscriptionId === subscriptionId && sub.status === "pending"
                    );
                    
                    if (pendingSubscription) {
                      // There's a pending subscription - update it to active
                      console.log(`Found pending subscription ${pendingSubscription.id} - updating to active status`);
                      
                      const updatedSubscription = await storage.updateUserSubscription(pendingSubscription.id, {
                        status: "active",
                        paymentVerified: true,
                        paymentSessionId: session.id, // Update with the new session ID
                      });
                      
                      console.log(`Updated subscription status:`, updatedSubscription);
                      
                      // Get subscription details
                      const subscription = await storage.getSubscription(subscriptionId);
                      if (subscription && subscription.leadCoins) {
                        // Update user's lead coins
                        await storage.updateUserLeadCoins(userId, subscription.leadCoins);
                        console.log(`Updated user's lead coins by ${subscription.leadCoins}`);
                      }
                    } else {
                      // No pending subscription found, we need to create a new one as a last resort
                      console.log(`No pending subscription found - creating new subscription as fallback`);
                      
                      // Get subscription details
                      const subscription = await storage.getSubscription(subscriptionId);
                      if (!subscription) {
                        console.error(`Subscription ${subscriptionId} not found`);
                        return res
                          .status(400)
                          .json({ error: "Subscription not found" });
                      }

                      // Create a new user subscription since one wasn't found
                      const newUserSubscription = await storage.createUserSubscription({
                        userId,
                        subscriptionId,
                        status: "active",
                        startDate: new Date(),
                        endDate: new Date(
                          Date.now() + subscription.durationDays * 24 * 60 * 60 * 1000,
                        ),
                        paymentSessionId: session.id,
                        paymentVerified: true,
                        initialLeadCoins: subscription.leadCoins,
                        leadCoinsLeft: subscription.leadCoins,
                      });

                      console.log(
                        `Created new user subscription:`,
                        newUserSubscription
                      );

                      // Update user's lead coins
                      await storage.updateUserLeadCoins(
                        userId,
                        subscription.leadCoins
                      );
                      console.log(
                        `Updated user's lead coins by ${subscription.leadCoins}`
                      );
                    }
                  }
                }
              } catch (error: any) {
                // Log any errors during processing
                console.error(`Error processing subscription payment:`, error);
                return res.status(500).json({
                  error: "Failed to process subscription payment",
                  details: error.message ? error.message : "Unknown error",
                });
              }