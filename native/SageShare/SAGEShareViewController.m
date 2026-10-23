#import <Social/Social.h>
#import <Security/Security.h>
#import "SageShareConfig.h"
@interface SAGEShareViewController : SLComposeServiceViewController
@property(nonatomic,copy) NSString *activityURL;
@property(nonatomic) BOOL sending;
@end
@implementation SAGEShareViewController
- (void)viewDidLoad {
 [super viewDidLoad]; self.title=@"Submit to Sage";self.view.tintColor=SAGE_SHARE_TINT;
 for(NSExtensionItem *item in self.extensionContext.inputItems) {
  for(NSItemProvider *provider in item.attachments) {
   NSString *type=[provider hasItemConformingToTypeIdentifier:@"public.url"]?@"public.url":([provider hasItemConformingToTypeIdentifier:@"public.plain-text"]?@"public.plain-text":nil);
   if(!type) continue;
   [provider loadItemForTypeIdentifier:type options:nil completionHandler:^(id value,NSError *error) {
    NSString *text=[value isKindOfClass:[NSURL class]]?[value absoluteString]:([value isKindOfClass:[NSString class]]?value:nil);
    if(!text)return;
    NSRegularExpression *regex=[NSRegularExpression regularExpressionWithPattern:@"https://(?:www\\.)?strava\\.com/activities/[0-9]+[^\\s]*|https://strava\\.app\\.link/[A-Za-z0-9_-]+[^\\s]*" options:0 error:nil];
    NSTextCheckingResult *match=[regex firstMatchInString:text options:0 range:NSMakeRange(0,text.length)];
    if(match)dispatch_async(dispatch_get_main_queue(),^{self.activityURL=[text substringWithRange:match.range];[self validateContent];});
   }];
  }
 }
}
- (BOOL)isContentValid {self.charactersRemaining=@(1000-self.contentText.length);return self.activityURL.length>0 && self.contentText.length<=1000 && !self.sending;}
- (NSArray *)configurationItems {
 SLComposeSheetConfigurationItem *item=[SLComposeSheetConfigurationItem new];item.title=@"Workout review";item.value=@"Strava link → admin approval";return @[item];
}
- (NSDictionary *)session {
 NSData *account=[SAGE_AUTH_STORAGE_KEY dataUsingEncoding:NSUTF8StringEncoding];
 for(NSString *service in @[@"app:no-auth",@"app"]) {
  NSDictionary *query=@{(__bridge id)kSecClass:(__bridge id)kSecClassGenericPassword,(__bridge id)kSecAttrService:service,(__bridge id)kSecAttrAccount:account,(__bridge id)kSecMatchLimit:(__bridge id)kSecMatchLimitOne,(__bridge id)kSecReturnData:@YES};
  CFTypeRef result=NULL;
  if(SecItemCopyMatching((__bridge CFDictionaryRef)query,&result)==errSecSuccess){NSData *data=CFBridgingRelease(result);id json=[NSJSONSerialization JSONObjectWithData:data options:0 error:nil];if([json isKindOfClass:[NSDictionary class]])return json;}
 }
 return nil;
}
- (void)message:(NSString *)text finish:(BOOL)finish {
 dispatch_async(dispatch_get_main_queue(),^{self.sending=NO;[self validateContent];UIAlertController *alert=[UIAlertController alertControllerWithTitle:@"Sage" message:text preferredStyle:UIAlertControllerStyleAlert];[alert addAction:[UIAlertAction actionWithTitle:@"OK" style:UIAlertActionStyleDefault handler:^(UIAlertAction *action){if(finish)[self.extensionContext completeRequestReturningItems:@[] completionHandler:nil];}]];[self presentViewController:alert animated:YES completion:nil];});
}
- (void)didSelectPost {
 NSDictionary *session=[self session];NSString *token=session[@"access_token"];
 if(!token.length||[session[@"expires_at"] doubleValue]<[NSDate date].timeIntervalSince1970){[self message:@"Open Sage and sign in to refresh your session, then share this activity again." finish:NO];return;}
 self.sending=YES;[self validateContent];
 NSMutableURLRequest *request=[NSMutableURLRequest requestWithURL:[NSURL URLWithString:[SAGE_SUPABASE_URL stringByAppendingString:@"/functions/v1/submit-workout"]]];request.HTTPMethod=@"POST";request.timeoutInterval=30;
 [request setValue:[@"Bearer " stringByAppendingString:token] forHTTPHeaderField:@"Authorization"];[request setValue:SAGE_SUPABASE_ANON_KEY forHTTPHeaderField:@"apikey"];[request setValue:@"application/json" forHTTPHeaderField:@"Content-Type"];
 request.HTTPBody=[NSJSONSerialization dataWithJSONObject:@{@"source":@"strava_link",@"url":self.activityURL,@"note":self.contentText?:@""} options:0 error:nil];
 [[[NSURLSession sharedSession] dataTaskWithRequest:request completionHandler:^(NSData *data,NSURLResponse *response,NSError *error){NSDictionary *json=data?[NSJSONSerialization JSONObjectWithData:data options:0 error:nil]:nil;NSInteger status=[(NSHTTPURLResponse *)response statusCode];BOOL success=!error&&status==200;[self message:success?([json[@"created"] boolValue]?@"Submitted for admin review. Your workout counts after approval.":@"This activity has already been submitted."):(json[@"error"]?:@"Unable to submit. Check your connection and try again.") finish:success];}] resume];
}
@end
