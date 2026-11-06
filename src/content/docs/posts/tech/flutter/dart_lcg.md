---
tags: ['dart']
title: Dart Linear Congruential Generator
description: Implementation of a linear congruential generator in Dart.
pubDate: Fri, 21 March 2023
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/2617761522.png
---

A linear congruential generator (LCG) is a type of pseudorandom number generator that generates a sequence of numbers based on a linear combination of its previous value, a constant multiplier, and a constant increment. The sequence produced by an LCG appears random, but is deterministic and periodic, with a period of at most the modulus value. LCGs are widely used in computer simulations, gaming, cryptography, and other applications that require random numbers.

There are several reasons why someone might choose to use Dart over Java:

1. Syntax: Dart has a more modern and concise syntax than Java, which some developers find easier to read and write.
2. Speed: Dart is generally faster than Java, especially when it comes to startup times and JIT (just-in-time) compilation.
3. Flutter framework: Dart is the primary language used for the Flutter framework, which is a popular choice for mobile app development. If you are building mobile apps with Flutter, using Dart can make development easier and more efficient.
4. Asynchronous programming: Dart has built-in support for asynchronous programming, which can make it easier to write code that is responsive and efficient.
5. Optional typing: Dart allows you to write code with or without static types, giving you more flexibility in how you write your code.

Ultimately, the choice between Dart and Java will depend on your specific needs and preferences as a developer.


```dart 
 // Class representation of a rational number. This rational number will always 
// be simplified as far as possible, will always indicate sign on the numerator
// and will always represent 0 as 0/1. For example 2/-8 will be represented as 
// -1/4 and 0/-128 will be represented as 0/1.
class Rational {
  // rational numerator, should be integer
  int _num;
  // rational denominator should be integer
  int _denom;

  int get numerator {return _num;}
  int get denominator {return _denom;}
  // creates a simplified rational number
  Rational(this._num, this._denom) {
    simplify();
  }
  Rational operator +(Rational other) {
    // int lcm_rl = std::lcm(this.numerator, other.denominator);
    int lcm_rl = _lcm(this.denominator, other.denominator);
    // // to compute multiple factor switch numbers around
    int left_fact = lcm_rl ~/ this.denominator;
    int right_fact = lcm_rl ~/ other.denominator;
    return Rational((this.numerator * left_fact) + (other.numerator * right_fact), lcm_rl);
  }
  Rational operator -(Rational other) {
    // int lcm_rl = std::lcm(this.numerator, other.denominator);
    int lcm_rl = _lcm(this.denominator, other.denominator);
    // // to compute multiple factor switch numbers around
    int left_fact = lcm_rl ~/ this.denominator;
    int right_fact = lcm_rl ~/ other.denominator;
    return Rational((this.numerator * left_fact) - (other.numerator * right_fact), lcm_rl);
  }
  Rational operator *(Rational other) {
    return Rational(this.numerator * other.numerator, this.denominator * other.denominator);
  }
  Rational operator /(Rational other) {
    return Rational(this.numerator * other.denominator, this.denominator * other.numerator);
  }

  // comparsion operators
  @override
  bool operator ==(Rational other) {
     return (this._num == other._num && this._denom == other._denom);
  }
  bool operator <(Rational other) {
    // compare numerators
    int lcm_com = _lcm(this._denom, other._denom);
    int lcm_denom = lcm_com ~/ this._denom;
    int lcm_rat_denom = lcm_com ~/ other._denom;
    // multiple numerators
    return ( (_num * lcm_denom) < (other._num * lcm_rat_denom));
  }
  // Inequality comparsion with [other]
  bool operator >(Rational other) {
    // compare numerators
    int lcm_com = _lcm(this._denom, other._denom);
    int lcm_denom = lcm_com ~/ this._denom;
    int lcm_rat_denom = lcm_com ~/ other._denom;
    // multiple numerators
    return ( (_num * lcm_denom) > (other._num * lcm_rat_denom));
  }

  void _treat_divide_by_zero() {
    if (_denom == 0) {
        _num = power(2,63) - 1;
        _denom = 1;
    }
  }
  // simplify function
  void simplify() {
    // Always represent 0 as 0/1
    _treat_divide_by_zero();

      // Divide by greatest common divisor, 
      int gcdValue = _gcd(_num, _denom);
      // gcd should never be 0 at this point, but if it is don't divide by zero
      if (gcdValue != 0) {
          _num ~/= gcdValue;
          _denom ~/= gcdValue;
      }

    // Indicate sign on numerator only
    if (_denom < 0) {
      _num = -_num;
      _denom = -_denom;
    }
  }
  // should be a utility function, but whatever
  int power(int x, int y) {
    int power = 1;
    for (int i = 0; i < y; i++) {
      power *= x;
    }
  
    return power;
  }
  // least common multiple
  int _lcm(int a, int b) => (a * b) ~/ _gcd(a, b);
  int _gcd(int a,int b)
  {
    if(b==0)
      return a;
    if(b!=0)
      return _gcd(b,a%b);
    return 0;
  }
  // Returns the integer value for a rational number
  int truncate()
  {   
      // could use integer division instead
      // find wholest number that can be divided by, subtract remainder
      int remain = _num % _denom;
      int whole_num = (_num - remain) ~/ _denom;
      return whole_num;
  }
  bool is_integer() {
    return (_num == 0 || _denom == 1);
  }
  @override
  // print the rational number as numerator/denominator,
  // example 3/5
  String toString() {
    return "${_num}/${_denom}";
  }
}
 
 ```

This is the implementation of a rational number class in Dart, which represents a fraction as a simplified fraction with a sign on the numerator and 0 as 0/1. The class includes basic arithmetic operations such as addition, subtraction, multiplication, and division, as well as comparison operators. It also has methods for simplification, finding the integer value of a rational number, and checking if a number is an integer. The class avoids division by 0 and has utility functions for finding the greatest common divisor and the least common multiple.


```dart 
import './lcg_interface.dart';

/// The event handler responsible for updating the badge in the UI.
class LCG implements LCG_Interface { 
  // lcg multiplier
  final int _a;
  // lcg increment
  final int _c;
  // lcg modulus
  final int _m;
  int _xi;
  // seed 
  int seedValue;
  int get multiplier {return _a;}
  int get increment {return _c;}
  int get modulus {return _m;}
  int get seed {return seedValue;}
  //setters
  void set seed(int newSeed) {seedValue = newSeed;}
  // constructor
  LCG(this._a,this._c,this._m, this.seedValue) {
    if ( _c % _m == 0 && seedValue % _m == 0) {
        _xi = 1;
    } else {
        _xi = seedValue;
    }
  }
  int currValue() {
    return _xi;
  }
  int nextNum() {
    _xi = _next();
    return _xi;
  }
  void discard(int n) {
    for (int i = 0; i < n; i++) {
      _xi = nextNum();
      // cout << "Next Iterator Value is: " << xi;
    }
  }
  int min() {
    if( _c == 0) return 1;
    return 0;
  }
  int max() {
    return _m-1;
  }
  int _next() {
    return (_a * _xi +_c) % _m;
  }
  @override
  bool operator==(LCG other) => (other.increment == this.increment && other.modulus == this.modulus && other.multiplier == this.multiplier);
}
 
 ```

This is a Dart class implementation of a linear congruential generator (LCG) that implements the LCG\_Interface interface. It takes in four parameters in the constructor: \_a (the multiplier), \_c (the increment), \_m (the modulus), and seedValue (the seed). The class has various methods that allow for generating the next pseudo-random number, getting the current value, setting the seed, and discarding some numbers. The class also has methods to get the minimum and maximum possible values that can be generated by the LCG and to check for equality with another LCG object.


```dart 
 class LCG_Interface { 
  // lcg multiplier
  int _a;
  // lcg increment
  int _c;
  // lcg modulus
  int _m;
  // seed 
  int _seed;
  // getters 
  int get multiplier {return _a;}
  int get increment {return _c;}
  int get modulus {return _m;}
  int get seed {return _seed;}
  //setters
  void set seed(int newSeed) {_seed = newSeed;}
  LCG_Interface(int multiplier, int increment, int modulus, int seed);
  int nextNum() {return 0;}
  void discard(int n) {}
  int min() { return 0;}
  int max() { return 1;}
  int currValue() {return 0;}
}
 
 ```

This is a declaration of a Dart class called `LCG_Interface`. It defines the public interface for a Linear Congruential Generator (LCG). The class has private instance variables `_a`, `_c`, `_m`, and `_seed`, which represent the LCG multiplier, increment, modulus, and seed, respectively.

The class has getters and setters for each of these instance variables. Additionally, the class declares several methods, including `nextNum()`, `discard(n)`, `min()`, `max()`, and `currValue()`.

The `nextNum()` method returns the next random number generated by the LCG, `discard(n)` advances the LCG n steps without generating numbers, `min()` returns the minimum possible generated value, `max()` returns the maximum possible generated value, and `currValue()` returns the current state of the LCG.

The constructor takes in four parameters: `multiplier`, `increment`, `modulus`, and `seed`, which are used to initialize the private instance variables.



## References
- https://github.com/FriendlyUser/dart-basic-math-lib
