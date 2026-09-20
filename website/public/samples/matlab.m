% Showcase: MATLAB — matrices, functions, and plots.
function demo()
    VERSION = "0.4.0";
    toks = highlight("function y = f(x) 2*x");
    fprintf("%d tokens\n", numel(toks));

    A = [1, 2; 3, 4];
    b = [5; 6];
    x = A \ b;               % solve Ax = b
    assert(norm(A*x - b) < 1e-9);

    t = linspace(0, 2*pi, 100);
    y = sin(t) + 0.5*sin(3*t);
    [pks, locs] = findpeaks(y, t);
    fprintf("peaks=%d\n", numel(pks));

    names = ["ada", "grace", "alan"];
    ages = [36, 85, 41];
    T = table(names', ages', 'VariableNames', {'name', 'age'});
    disp(T(T.age >= 18, :));

    total = sum(arrayfun(@(n) n*2, [3, 1, 2]));
    fprintf("total=%d\n", total);

    try
        risky();
    catch ME
        fprintf(2, "caught: %s\n", ME.message);
    end
end

function toks = highlight(source)
    arguments
        source (1,:) char {mustBeNonempty}
    end
    words = strsplit(strtrim(source));
    toks = struct('start', {}, 'end', {}, 'kind', {});
    off = 0;
    for i = 1:numel(words)
        w = words{i};
        if ismember(w, ["function", "return", "if"])
            kind = "keyword";
        elseif ~isempty(regexp(w, '^\d+$', 'once'))
            kind = "number";
        else
            kind = "other";
        end
        toks(i).start = off; %#ok<AGROW>
        toks(i).end = off + strlength(w);
        toks(i).kind = kind;
        off = off + strlength(w) + 1;
    end
end
