// Showcase: Objective-C — classes, protocols, blocks, ARC.
#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

typedef NS_ENUM(NSInteger, HLKind) {
    HLKindKeyword,
    HLKindString,
    HLKindNumber,
    HLKindOther
};

@interface HLSpan : NSObject <NSCopying>
@property (nonatomic, readonly) NSUInteger start;
@property (nonatomic, readonly) NSUInteger end;
@property (nonatomic, readonly) HLKind kind;
- (instancetype)initWithStart:(NSUInteger)start
                          end:(NSUInteger)end
                         kind:(HLKind)kind NS_DESIGNATED_INITIALIZER;
- (instancetype)init NS_UNAVAILABLE;
- (NSUInteger)width;
- (NSString *)description;
@end

@implementation HLSpan
- (instancetype)initWithStart:(NSUInteger)start
                          end:(NSUInteger)end
                         kind:(HLKind)kind {
    if (self = [super init]) {
        _start = start;
        _end = end;
        _kind = kind;
    }
    return self;
}
- (NSUInteger)width { return self.end - self.start; }
- (NSString *)description {
    return [NSString stringWithFormat:@"%ld[%lu:%lu]",
            (long)self.kind, self.start, self.end];
}
- (id)copyWithZone:(NSZone *)zone {
    return [[HLSpan allocWithZone:zone] initWithStart:self.start
                                                  end:self.end
                                                 kind:self.kind];
}
@end

@protocol HLHighlighting <NSObject>
@property (nonatomic, readonly) NSString *language;
- (NSArray<HLSpan *> *)highlightSource:(NSString *)source
                                 error:(NSError **)error;
@end

@interface HLHighlighter : NSObject <HLHighlighting>
- (instancetype)initWithLanguage:(NSString *)language;
@end

@implementation HLHighlighter {
    NSSet<NSString *> *_keywords;
    NSMutableDictionary<NSString *, NSArray<HLSpan *> *> *_cache;
}
- (instancetype)initWithLanguage:(NSString *)language {
    if (self = [super init]) {
        _language = [language copy];
        _keywords = [NSSet setWithArray:@[@"@interface", @"@end", @"return"]];
        _cache = [NSMutableDictionary dictionary];
    }
    return self;
}
- (NSArray<HLSpan *> *)highlightSource:(NSString *)source
                                 error:(NSError **)error {
    if (source.length == 0) {
        if (error) *error = [NSError errorWithDomain:@"HL" code:1 userInfo:nil];
        return nil;
    }
    NSArray *hit = _cache[source];
    if (hit) return hit;
    NSMutableArray *out = [NSMutableArray array];
    __block NSUInteger offset = 0;
    [source enumerateSubstringsInRange:NSMakeRange(0, source.length)
                              options:NSStringEnumerationByWords
                           usingBlock:^(NSString *word, NSRange _, NSRange __, BOOL *stop) {
        HLKind kind = [_keywords containsObject:word] ? HLKindKeyword : HLKindOther;
        [out addObject:[[HLSpan alloc] initWithStart:offset
                                                 end:offset + word.length
                                                kind:kind]];
        offset += word.length + 1;
    }];
    _cache[source] = [out copy];
    return [out copy];
}
@end

int main(int argc, const char *argv[]) {
    @autoreleasepool {
        HLHighlighter *hl = [[HLHighlighter alloc] initWithLanguage:@"objc"];
        NSError *error = nil;
        NSArray *toks = [hl highlightSource:@"@interface Foo return" error:&error];
        NSLog(@"%lu tokens", (unsigned long)toks.count);

        NSArray *nums = @[@3, @1, @2];
        NSArray *sorted = [nums sortedArrayUsingComparator:^NSComparisonResult(id a, id b) {
            return [a compare:b];
        }];
        NSMutableString *s = [NSMutableString stringWithString:@"hi"];
        [s appendFormat:@" %@", @"there"];
        NSLog(@"%@ %@", sorted, s.uppercaseString);
    }
    return 0;
}

NS_ASSUME_NONNULL_END
