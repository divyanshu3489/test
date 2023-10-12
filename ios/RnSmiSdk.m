#import "RnSmiSdk.h"
#import "SmiSdk.h"

@implementation RnSmiSdk

RCT_EXPORT_MODULE()

- (dispatch_queue_t)methodQueue
{
    return dispatch_get_main_queue();
}


RCT_EXPORT_METHOD(startSponsorVpn) {
    [SmiSdk startSponsorVpn];
}

RCT_EXPORT_METHOD(stopSponsorVpn) {
    [SmiSdk stopSponsorVpn];
}

RCT_EXPORT_METHOD(updateUserId:(NSString*)userId) {
    [SmiSdk updateUserId:userId];
}

RCT_EXPORT_METHOD(updateTags:(NSArray *)tags) {
    [SmiSdk updateTag:tags];
}


@end
