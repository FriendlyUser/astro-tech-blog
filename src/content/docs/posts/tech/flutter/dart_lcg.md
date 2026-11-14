---
tags: ['dart']
title: Writing a linear congruential generator (and a Rational class) in Dart
description: A linear congruential generator and a simplified-fraction Rational class in Dart 3, ported from my dart-basic-math-lib, with the gotchas around overflow and seeding.
pubDate: Fri, 21 March 2023
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/2617761522.png
---

A linear congruential generator (LCG) produces pseudorandom numbers with one recurrence:

```text
x(n+1) = (a * x(n) + c) mod m
```

`a` is the multiplier, `c` the increment and `m` the modulus. The output looks random but is fully
determined by the seed, and it repeats with a period of at most `m`. LCGs are cheap and easy to
reproduce, which makes them fine for simulations, games and tests. They are **not** suitable for
cryptography: a few consecutive outputs are enough to recover the parameters and predict the rest.
Dart's own `Random.secure()` exists for that.

The code below comes from my [dart-basic-math-lib](https://github.com/FriendlyUser/dart-basic-math-lib)
repo, which also has a `Rational` class. The repo targets Dart 2 without null safety and doesn't
compile on Dart 3, so the versions here are updated for Dart 3.

## The interface

```dart
// lcg_interface.dart
abstract interface class LcgInterface {
  int get multiplier;
  int get increment;
  int get modulus;
  int get seed;
  set seed(int newSeed);

  /// Current state, without advancing.
  int currValue();

  /// Advances one step and returns the new state.
  int nextNum();

  /// Advances [n] steps.
  void discard(int n);

  int min();
  int max();
}
```

The original was a concrete class with private fields and dummy method bodies. An
`abstract interface class` (Dart 3) states the contract without any of that, and the implementation
below can `implement` it without inheriting fields it can't see.

## The generator

```dart
// lcg.dart
import 'lcg_interface.dart';

class LCG implements LcgInterface {
  final int _a; // multiplier
  final int _c; // increment
  final int _m; // modulus
  int _seed;
  int _xi; // current state

  LCG(int multiplier, int increment, int modulus, int seed)
      : assert(modulus > 0),
        _a = multiplier,
        _c = increment,
        _m = modulus,
        _seed = seed,
        _xi = _initialState(increment, modulus, seed);

  // Same rule as C++'s std::linear_congruential_engine: if the increment and
  // the seed are both multiples of the modulus, start at 1 instead of 0.
  // Otherwise a multiplicative generator (c == 0) would output 0 forever.
  static int _initialState(int c, int m, int seed) =>
      (c % m == 0 && seed % m == 0) ? 1 : seed % m;

  @override
  int get multiplier => _a;
  @override
  int get increment => _c;
  @override
  int get modulus => _m;
  @override
  int get seed => _seed;

  @override
  set seed(int newSeed) {
    _seed = newSeed;
    _xi = _initialState(_c, _m, newSeed);
  }

  @override
  int currValue() => _xi;

  @override
  int nextNum() => _xi = (_a * _xi + _c) % _m;

  @override
  void discard(int n) {
    for (var i = 0; i < n; i++) {
      nextNum();
    }
  }

  @override
  int min() => _c == 0 ? 1 : 0;

  @override
  int max() => _m - 1;

  // Two generators are equal if they have the same parameters.
  @override
  bool operator ==(Object other) =>
      other is LCG && other._a == _a && other._c == _c && other._m == _m;

  @override
  int get hashCode => Object.hash(_a, _c, _m);
}
```

Changes from the original:

- `==` now takes `Object` and there is a matching `hashCode`. Overriding `==` with a narrower
  parameter type (`LCG other`) is a compile error.
- `_xi` is set in the initializer list, which null safety requires for a non-nullable field.
- The seed setter resets the state. Before, it changed the stored seed but kept generating from the
  old state.
- The initial state is `seed % m` rather than `seed`, so a seed larger than the modulus is still a
  valid state.

Equality only compares the parameters, not the current state, so two generators at different
points in the same sequence are still `==`. C++'s `std::linear_congruential_engine` compares state
instead; pick whichever matches how you use it.

## Checking it

`minstd_rand` from the C++ standard library is an LCG with `a = 48271`, `c = 0`, `m = 2^31 - 1` and a
default seed of 1. The standard requires its 10,000th output to be 399268537, which makes a handy
test:

```dart
import 'lcg.dart';

void main() {
  final minstd = LCG(48271, 0, 2147483647, 1);
  print(minstd.nextNum()); // 48271
  print(minstd.nextNum()); // 182605794

  final check = LCG(48271, 0, 2147483647, 1)..discard(9999);
  print(check.nextNum()); // 399268537
}
```

## Gotchas

- **Overflow.** On the Dart VM and in AOT builds, `int` is 64-bit and wraps silently. `a * x + c`
  must stay below 2^63, so `a * (m - 1) + c` is the limit to check. On the web, `int` is a
  JavaScript number and is only exact up to 2^53, so the same parameters can give different
  sequences in a browser.
- **Bad parameters give short periods.** `LCG(5, 4, 3, 2)` (the example in the repo) outputs `2`
  forever. With `c != 0`, the period is the full `m` only when `c` and `m` are coprime, `a - 1` is
  divisible by every prime factor of `m`, and `a - 1` is divisible by 4 if `m` is (the Hull–Dobell
  theorem). Use published constants rather than picking your own.
- For anything that isn't a learning exercise, `dart:math`'s `Random(seed)` already takes a seed.

## The Rational class

The same repo has a `Rational` class that keeps fractions in lowest terms, puts the sign on the
numerator, and stores zero as `0/1`, so `2/-8` becomes `-1/4` and `0/-128` becomes `0/1`. The
original mutated itself in a `simplify()` method; this version is immutable and simplifies once in
the factory constructor:

```dart
class Rational implements Comparable<Rational> {
  final int numerator;
  final int denominator; // always > 0

  Rational._(this.numerator, this.denominator);

  factory Rational(int numerator, int denominator) {
    if (denominator == 0) {
      throw ArgumentError.value(denominator, 'denominator', 'must not be zero');
    }
    // int.gcd is never negative; gcd(0, d) == |d|, so zero becomes 0/1.
    final g = numerator.gcd(denominator);
    var n = numerator ~/ g;
    var d = denominator ~/ g;
    if (d < 0) {
      n = -n;
      d = -d;
    }
    return Rational._(n, d);
  }

  static int _lcm(int a, int b) => a ~/ a.gcd(b) * b;

  Rational operator +(Rational other) {
    final lcm = _lcm(denominator, other.denominator);
    return Rational(
      numerator * (lcm ~/ denominator) + other.numerator * (lcm ~/ other.denominator),
      lcm,
    );
  }

  Rational operator -(Rational other) => this + Rational(-other.numerator, other.denominator);

  Rational operator *(Rational other) =>
      Rational(numerator * other.numerator, denominator * other.denominator);

  // Throws ArgumentError when dividing by zero.
  Rational operator /(Rational other) =>
      Rational(numerator * other.denominator, denominator * other.numerator);

  // Denominators are positive, so cross-multiplying keeps the order.
  @override
  int compareTo(Rational other) =>
      (numerator * other.denominator).compareTo(other.numerator * denominator);

  bool operator <(Rational other) => compareTo(other) < 0;
  bool operator >(Rational other) => compareTo(other) > 0;

  @override
  bool operator ==(Object other) =>
      other is Rational && other.numerator == numerator && other.denominator == denominator;

  @override
  int get hashCode => Object.hash(numerator, denominator);

  /// Integer part, rounded toward zero (-7/2 gives -3).
  int truncate() => numerator ~/ denominator;

  bool get isInteger => denominator == 1;

  @override
  String toString() => '$numerator/$denominator';
}

void main() {
  print(Rational(2, -8)); // -1/4
  print(Rational(0, -128)); // 0/1
  print(Rational(1, 2) + Rational(1, 3)); // 5/6
  print(Rational(1, 2) < Rational(2, 3)); // true
  print(Rational(-7, 2).truncate()); // -3
}
```

Behaviour that changed from the original:

- Dividing by zero now throws. The original quietly turned `x/0` into `9223372036854775807/1`.
- `truncate()` rounds toward zero. The original used `%`, which in Dart is never negative, so
  `-7/2` truncated to `-4`.
- `==` takes `Object` and has a `hashCode`, for the same reason as in the LCG.

Because simplification is applied on every operation and equal values always have the same
representation, comparing numerator and denominator is enough for `==`.

## References

- https://github.com/FriendlyUser/dart-basic-math-lib
- [`std::linear_congruential_engine` on cppreference](https://en.cppreference.com/w/cpp/numeric/random/linear_congruential_engine)
- [Dart class modifiers](https://dart.dev/language/class-modifiers)
