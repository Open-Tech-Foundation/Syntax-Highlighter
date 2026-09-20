// Showcase: C++ — classes, templates, STL, and smart pointers.
#include <algorithm>
#include <cassert>
#include <chrono>
#include <filesystem>
#include <fstream>
#include <functional>
#include <iostream>
#include <map>
#include <memory>
#include <numeric>
#include <optional>
#include <set>
#include <sstream>
#include <string>
#include <thread>
#include <utility>
#include <variant>
#include <vector>

namespace highlight {

inline constexpr const char* kVersion = "0.4.0";
inline constexpr int kMaxRetries = 3;
inline constexpr double kRatio = 0.75;

enum class Kind { Keyword, String, Number, Comment, Other };

struct Token {
    Kind kind;
    std::size_t start;
    std::size_t end;

    [[nodiscard]] std::size_t width() const noexcept { return end - start; }
    [[nodiscard]] std::string_view text(const std::string& src) const {
        return std::string_view(src).substr(start, width());
    }
};

inline std::ostream& operator<<(std::ostream& os, const Token& tok) {
    return os << static_cast<int>(tok.kind) << '[' << tok.start << ':' << tok.end << ']';
}

class Highlighter {
public:
    explicit Highlighter(std::string language = "cpp")
        : language_(std::move(language)) {
        keywords_.insert({"int", "return", "class", "template", "auto"});
    }
    virtual ~Highlighter() = default;

    Highlighter(const Highlighter&) = delete;
    Highlighter& operator=(const Highlighter&) = delete;

    [[nodiscard]] const std::string& language() const noexcept { return language_; }

    virtual std::vector<Token> highlight(const std::string& source) {
        if (source.empty()) {
            throw std::invalid_argument("empty source");
        }
        auto it = cache_.find(source);
        if (it != cache_.end()) {
            ++hits_;
            return it->second;
        }
        ++misses_;
        std::vector<Token> toks;
        std::size_t pos = 0;
        while (pos < source.size()) {
            if (std::isspace(static_cast<unsigned char>(source[pos]))) {
                ++pos;
                continue;
            }
            std::size_t end = pos;
            while (end < source.size() && !std::isspace(static_cast<unsigned char>(source[end]))) {
                ++end;
            }
            std::string word = source.substr(pos, end - pos);
            Kind kind = keywords_.count(word) ? Kind::Keyword : Kind::Other;
            toks.push_back({kind, pos, end});
            pos = end;
        }
        cache_[source] = toks;
        return toks;
    }

    void clear() noexcept { cache_.clear(); }

protected:
    std::string language_;
    std::set<std::string> keywords_;
    std::map<std::string, std::vector<Token>> cache_;
    long hits_ = 0;
    long misses_ = 0;
};

class HtmlHighlighter final : public Highlighter {
public:
    using Highlighter::Highlighter;

    std::vector<Token> highlight(const std::string& source) override {
        auto toks = Highlighter::highlight(source);
        std::cout << "highlighted " << toks.size() << " tokens\n";
        return toks;
    }
};

template <typename T>
concept Numeric = std::is_arithmetic_v<T>;

template <Numeric T>
T add(T a, T b) {
    return a + b;
}

template <typename T, typename U>
auto combine(const std::vector<T>& a, const std::vector<U>& b) {
    std::vector<std::pair<T, U>> out;
    for (std::size_t i = 0; i < std::min(a.size(), b.size()); ++i) {
        out.emplace_back(a[i], b[i]);
    }
    return out;
}

}  // namespace highlight

int main() {
    using namespace highlight;
    auto started = std::chrono::steady_clock::now();

    auto hl = std::make_unique<HtmlHighlighter>("cpp");
    std::shared_ptr<Highlighter> shared = std::move(hl);
    std::weak_ptr<Highlighter> weak = shared;

    std::vector<int> nums = {3, 1, 2};
    std::sort(nums.begin(), nums.end(), std::greater<int>{});
    int total = std::accumulate(nums.begin(), nums.end(), 0);
    assert(total == 6 && "math broke");

    auto squares = nums | std::views::transform([](int n) { return n * n; });
    for (int n : squares) {
        std::cout << n << ' ';
    }
    std::cout << '\n';

    std::map<std::string, int> ages{{"ada", 36}, {"grace", 85}};
    ages.try_emplace("alan", 41);
    if (auto it = ages.find("ada"); it != ages.end()) {
        std::cout << "ada=" << it->second << '\n';
    }

    std::optional<std::string> maybe;
    std::string value = maybe.value_or("fallback");
    std::variant<int, std::string> either = 42;
    std::visit([](const auto& v) { std::cout << v << '\n'; }, either);

    std::function<int(int)> twice = [](int n) { return n * 2; };
    auto bound = std::bind(twice, std::placeholders::_1);

    std::filesystem::path p = std::filesystem::current_path() / "input.txt";
    std::ifstream in(p);
    std::stringstream buffer;
    buffer << in.rdbuf();

    std::jthread worker([](std::stop_token stop) {
        while (!stop.stop_requested()) {
            std::this_thread::sleep_for(std::chrono::milliseconds(10));
        }
    });

    auto elapsed = std::chrono::steady_clock::now() - started;
    std::cout << "done in "
              << std::chrono::duration_cast<std::chrono::milliseconds>(elapsed).count()
              << "ms\n";
    return 0;
}
