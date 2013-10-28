#import "URLProtocolHyper.h"

@implementation URLProtocolHyper

+ (BOOL)canInitWithRequest:(NSURLRequest*)theRequest
{
    NSLog(@"canInitWithRequest %@", theRequest.URL);
    if ([theRequest.URL.scheme caseInsensitiveCompare:@"hyper"]
        == NSOrderedSame)
    {
        return YES;
    }
    return NO;
}

+ (NSURLRequest*)canonicalRequestForRequest:(NSURLRequest*)theRequest
{
    return theRequest;
}

- (void)startLoading
{
    NSLog(@"startLoading %@", self.request.URL);
    /*
    NSURLResponse *response = [[NSURLResponse alloc] initWithURL:self.request.URL
                                                        MIMEType:@"image/png"
                                           expectedContentLength:-1
                                                textEncodingName:nil];
    
    NSString *imagePath = [[NSBundle mainBundle] pathForResource:@"image1" ofType:@"png"];
    NSData *data = [NSData dataWithContentsOfFile:imagePath];
    
    [[self client] URLProtocol:self didReceiveResponse:response cacheStoragePolicy:NSURLCacheStorageNotAllowed];
    [[self client] URLProtocol:self didLoadData:data];
    [[self client] URLProtocolDidFinishLoading:self];
    [response release];
     */
}

- (void)stopLoading
{
    NSLog(@"request cancelled. stop loading the response, if possible");
}

@end
