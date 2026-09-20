# Showcase: CMake — targets, options, and install rules.
cmake_minimum_required(VERSION 3.28)

project(
  highlight-demo
  VERSION 0.4.0
  DESCRIPTION "Semantic syntax highlighting"
  LANGUAGES C CXX
)

set(CMAKE_C_STANDARD 17)
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

option(BUILD_TESTS "Build the test suite" ON)
option(BUILD_SHARED "Build a shared library" OFF)

find_package(Threads REQUIRED)

add_library(highlight
  src/lexer.c
  src/tokenizer.c
  src/renderers.c
)
target_include_directories(highlight PUBLIC
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
  $<INSTALL_INTERFACE:include>
)
target_compile_options(highlight PRIVATE -Wall -Wextra -Werror)
target_link_libraries(highlight PUBLIC Threads::Threads)
set_target_properties(highlight PROPERTIES
  VERSION ${PROJECT_VERSION}
  OUTPUT_NAME highlight
)

add_executable(demo tools/demo.c)
target_link_libraries(demo PRIVATE highlight)

if(BUILD_TESTS)
  enable_testing()
  add_executable(tokenizer_test tests/tokenizer_test.c)
  target_link_libraries(tokenizer_test PRIVATE highlight)
  add_test(NAME tokenizer COMMAND tokenizer_test)
endif()

install(TARGETS highlight demo
  RUNTIME DESTINATION bin
  LIBRARY DESTINATION lib
  ARCHIVE DESTINATION lib
)
install(DIRECTORY include/ DESTINATION include)
