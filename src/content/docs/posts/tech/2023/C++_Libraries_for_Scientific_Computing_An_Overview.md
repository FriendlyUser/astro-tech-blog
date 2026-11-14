---
description: A short tour of C++ (and C) libraries for scientific computing, covering what each one is for, its licence, and an Eigen example that solves a linear system.
imgSrc: /imgs/2023/1444932837.png
layout: '@/templates/BasePost.astro'
pubDate: '2023-10-08T15:59:26.000Z'
lastUpdated: 2026-11-14
tags: ["cpp"]
title: "C++ libraries for scientific computing: Eigen, Armadillo, Boost.Math, Ceres, FFTW and more"
---

C++ is a common choice for numerical code because you get control over memory layout and can still write `A * x` instead of nested loops. Most of that comes from libraries rather than the language. Here are the ones you are most likely to meet, grouped by what they do.

| Library | Use it for | Licence |
| --- | --- | --- |
| Eigen | Dense and sparse linear algebra | MPL 2.0 |
| Armadillo | Linear algebra with MATLAB-like syntax | Apache 2.0 |
| Boost.Math, Boost.Odeint, Boost.Geometry | Special functions, statistics, ODEs, geometry | Boost Software License |
| Ceres Solver | Nonlinear least squares and optimisation | BSD 3-clause |
| VTK | 3D visualisation of scientific data | BSD 3-clause |
| OpenCV | Image processing and computer vision | Apache 2.0 |
| FFTW | Fast Fourier transforms (C library) | GPL v2+ or commercial |
| GSL | General numerical routines (C library) | GPL v3 |

Check the licence before you pick one: FFTW and GSL are GPL, which affects how you can distribute software that links them.

## Eigen

**Website:** [libeigen.gitlab.io](https://libeigen.gitlab.io/)

Eigen is a header-only template library for matrices, vectors, decompositions and solvers. It supports fixed-size types (`Matrix3d`, stored on the stack with no allocation) and dynamic-size types (`MatrixXd`), and it uses expression templates, so `a + b + c` is evaluated in a single loop without temporaries. It vectorises with SSE/AVX/NEON and can use OpenMP for large matrix products. The `Eigen/Sparse` module adds sparse matrices with direct and iterative solvers.

Solving a small symmetric positive-definite system `Ax = b`:

```cpp
#include <Eigen/Dense>
#include <iostream>

int main() {
    Eigen::Matrix3d A;
    A <<  4, -2,  1,
         -2,  4, -2,
          1, -2,  4;
    Eigen::Vector3d b(11, -16, 17);

    Eigen::Vector3d x = A.ldlt().solve(b);
    std::cout << x.transpose() << '\n'; // 1 -2 3
}
```

Since it's header-only, building just needs the include path, for example `g++ -O2 -I/usr/include/eigen3 main.cpp` on Linux with the distribution package installed. Pick the decomposition to match the matrix: `ldlt()` or `llt()` for symmetric positive-definite, `partialPivLu()` for general square matrices, `colPivHouseholderQr()` for least squares.

## Armadillo

**Website:** [arma.sourceforge.net](https://arma.sourceforge.net/)

Armadillo offers similar functionality with syntax close to MATLAB (`mat A = randu<mat>(4,4); vec x = solve(A, b);`), which makes it a good fit for porting MATLAB or NumPy prototypes. It covers dense and sparse matrices, complex numbers, statistics and random number generation.

Unlike Eigen, Armadillo relies on BLAS and LAPACK for decompositions, inverses and solvers. Basic arithmetic works without them, but you'll want OpenBLAS, Intel MKL or Apple Accelerate linked in. It can be used as a pure template library by defining `ARMA_DONT_USE_WRAPPER` and linking BLAS/LAPACK yourself.

## Boost

**Website:** [boost.org](https://www.boost.org/)

Several Boost libraries are aimed at numerical work:

- **Boost.Math:** special functions (gamma, Bessel, elliptic integrals), statistical distributions, quadrature, root finding, interpolation and automatic differentiation.
- **Boost.Odeint:** ODE solvers (Runge–Kutta, adaptive step size, stiff solvers) that work with your own state types, including Eigen vectors.
- **Boost.Geometry:** points, polygons and spatial indexes, with algorithms such as intersection, area and distance.

## Ceres Solver

**Website:** [ceres-solver.org](http://ceres-solver.org/)

Ceres, from Google, solves nonlinear least-squares problems (with optional bounds) and general unconstrained optimisation problems. It is widely used for bundle adjustment and SLAM in computer vision.

- Trust-region methods (Levenberg–Marquardt and Dogleg) and line-search methods (including BFGS and L-BFGS).
- Automatic, numeric or analytic derivatives. Automatic differentiation via templated cost functors is the usual choice.
- Dense, sparse and iterative linear solvers, chosen to exploit problem structure.
- Robust loss functions (Huber, Cauchy and others) to reduce the effect of outliers.

## VTK

**Website:** [vtk.org](https://vtk.org/)

The Visualization Toolkit handles 3D rendering, image processing and visualisation of scientific data: structured and unstructured grids, polygonal meshes and volumes. It has a large set of filters (contouring, clipping, streamlines) and supports parallel processing with MPI. ParaView and VisIt are both built on VTK, and VTK has Python bindings (`pip install vtk`).

## OpenCV

**Website:** [opencv.org](https://opencv.org/)

OpenCV covers image and video processing: filtering, edge detection, geometric transforms, feature detection, camera calibration and object tracking. Its `dnn` module runs inference on models exported from other frameworks (for example ONNX models from PyTorch). OpenCL acceleration is built in, and CUDA modules are available from the `opencv_contrib` repository. Its `highgui` module can display windows using GTK, Qt or the native Windows/macOS backends.

## FFTW

**Website:** [fftw.org](https://www.fftw.org/)

FFTW computes discrete Fourier transforms of any size and dimension, for real and complex data, in single, double and extended precision. It is a C library; you call its C API from C++ (`fftw_complex` is layout-compatible with `std::complex<double>`). Its speed comes from a planner that times different algorithms on your machine and picks the fastest, plus generated codelets with SIMD. It supports multithreading and MPI.

Create the plan once and reuse it: planning with `FFTW_MEASURE` can take much longer than the transform itself.

## GSL

**Website:** [gnu.org/software/gsl](https://www.gnu.org/software/gsl/)

The GNU Scientific Library is also a C library, with no official C++ wrapper. It covers special functions, random number generators and distributions, linear algebra, numerical integration and differentiation, root finding, interpolation, unconstrained minimisation and nonlinear least-squares fitting. Its main draw is breadth and well-documented, stable APIs; its main drawbacks for C++ users are manual memory management (`gsl_vector_alloc`/`gsl_vector_free`) and the GPL licence.

## Where to start

For most new C++ numerical code, start with Eigen for linear algebra and Boost.Math for special functions and statistics. Add Ceres if you need nonlinear optimisation, FFTW if FFTs are on the hot path (and the licence works for you), and VTK or OpenCV when you need visualisation or image processing.
