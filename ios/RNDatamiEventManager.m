//
//  RNDatamiEventManager.m
//  RNDatamiSdk
//
//  Created by Sonali Sagar on 30/07/18.
//  Copyright © 2018 Facebook. All rights reserved.
//

#import "RNDatamiEventManager.h"
#import "SmiSdk.h"

@implementation RNDatamiEventManager
{
    bool hasListeners;
    SmiResult* sr;
}


- (dispatch_queue_t)methodQueue
{
    return dispatch_get_main_queue();
}

+(BOOL)requiresMainQueueSetup {
    return YES;
}

RCT_EXPORT_MODULE()

-(id)init {
  if(self = [super init]){
      hasListeners = NO;
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(handleNotification:)
                                                 name:SDSTATE_CHANGE_NOTIF
                                               object:nil];
  }

  return self;
}

-(void)startObserving {
    hasListeners = YES;
    if(sr != nil) {
      NSString *sdStateString = [self getSdStateString:sr.sdState];
      [self sendEventWithName:@"DATAMI_EVENT" body:@{@"state": sdStateString}];
    }
}

-(void)stopObserving {
    hasListeners = NO;
}

-(NSArray<NSString *> *)supportedEvents
{
        return @[@"DATAMI_EVENT"];
}

-(NSString *)getSdStateString :(int)state {
    NSString *sdStateString = @"SD_NOT_AVAILABLE";
    switch ( state ) {
    case 1:
        sdStateString = @"SD_WIFI";
        break;
    case 2:
        sdStateString = @"SD_AVAILABLE";
        break;
    default:
        sdStateString = @"SD_NOT_AVAILABLE";
        break;
    }

    return sdStateString;
}

- (void)handleNotification:(NSNotification *)notif {
    if([notif.name isEqualToString:SDSTATE_CHANGE_NOTIF])
    {   
        sr =  notif.object;
        NSString *sdStateString = [self getSdStateString:sr.sdState];
        NSString *sdReasonString = [SmiSdk getReasonString:sr.sdReason];
        // NSLog(@"receivedStateChage, sdState: %@ sr.clientIp:%@ sr.carrierName:%@ sdReason: %ld ", [self getSdStateString:sr.sdState], sr.clientIp, sr.carrierName, [SmiSdk getReasonString:sr.sdReason]);
        NSLog(@"receivedStateChage, sdState: %@ sr.clientIp:%@ sr.carrierName:%@ sdReason: %@ ", sdStateString, sr.clientIp, sr.carrierName, sdReasonString);

        if(hasListeners) {
          if(sr.clientIp != nil){
            // [self sendEventWithName:@"DATAMI_EVENT" body:@{@"state": [NSNumber numberWithInteger:sr.sdState],@"sdReason": [NSNumber numberWithInt:sr.sdReason],
         // @"clientIp": sr.clientIp, @"carrierName": sr.carrierName}];
            [self sendEventWithName:@"DATAMI_EVENT" body:@{@"state": sdStateString,@"sdReason": sdReasonString, @"clientIp": sr.clientIp, @"carrierName": sr.carrierName}];

          }else{
            // [self sendEventWithName:@"DATAMI_EVENT" body:@{@"state": [NSNumber numberWithInteger:sr.sdState],@"sdReason": [NSNumber numberWithInt:sr.sdReason],
         // @"carrierName": sr.carrierName}];
            [self sendEventWithName:@"DATAMI_EVENT" body:@{@"state": sdStateString,@"sdReason": sdReasonString, @"carrierName": sr.carrierName}];
          }
        }
    }
    else
    {
        NSLog(@"Not a datami event");
        
    }
}

@end
