! Showcase: Fortran — modules, arrays, and OpenMP.
module highlight_mod
  implicit none
  private
  public :: token_t, highlight, KIND_KEYWORD

  integer, parameter :: KIND_KEYWORD = 1
  integer, parameter :: KIND_STRING = 2
  integer, parameter :: KIND_NUMBER = 3
  integer, parameter :: KIND_OTHER = 4

  type :: token_t
    integer :: start = 0
    integer :: end = 0
    integer :: kind = KIND_OTHER
  contains
    procedure :: width
  end type token_t

contains

  pure integer function width(self) result(w)
    class(token_t), intent(in) :: self
    w = self%end - self%start
  end function width

  subroutine highlight(source, tokens, n)
    character(len=*), intent(in) :: source
    type(token_t), allocatable, intent(out) :: tokens(:)
    integer, intent(out) :: n
    integer :: i, s, e, count
    count = 0
    allocate(tokens(64))
    i = 1
    do while (i <= len_trim(source))
      if (source(i:i) == ' ') then
        i = i + 1
        cycle
      end if
      s = i
      do while (i <= len_trim(source) .and. source(i:i) /= ' ')
        i = i + 1
      end do
      e = i - 1
      count = count + 1
      tokens(count)%start = s
      tokens(count)%end = e
      tokens(count)%kind = KIND_OTHER
    end do
    n = count
  end subroutine highlight

end module highlight_mod

program demo
  use highlight_mod
  use omp_lib
  implicit none
  type(token_t), allocatable :: toks(:)
  integer :: n, i
  real(8), dimension(3) :: nums = [3.0d0, 1.0d0, 2.0d0]
  real(8) :: total = 0.0d0
  character(len=32) :: label = "total"

  call highlight("let answer = 42", toks, n)
  print *, n, "tokens"

  !$omp parallel do reduction(+:total)
  do i = 1, size(nums)
    total = total + nums(i) * 2.0d0
  end do
  !$omp end parallel do

  write (*, '(A, F8.2)') trim(label)//"=", total

  select case (n)
  case (0)
    print *, "empty"
  case (1:10)
    print *, "few"
  case default
    print *, "many"
  end select
end program demo
