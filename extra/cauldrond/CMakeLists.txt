cmake_minimum_required(VERSION 3.0)
project(cauldrond VERSION 2.1 LANGUAGES C)

# Options
set(PORT 2001)
set(UID 33)
set(GID 33)
set(PIDFILE "/run/cauldrond.pid")
set(LOGFILE "")

# Compiler
set(CMAKE_C_FLAGS "-O2 -Wall -Wextra ${CMAKE_C_FLAGS}")
set(CMAKE_BUILD_TYPE "RelWithDebInfo")

# Configure files
configure_file(config.h.in config.h)

# Sources
set(cauldrond_src
	src/base64.c
	src/base64.h
	src/handshake.c
	src/cauldrond.c
	src/sha1.c
	src/sha1.h
	src/utf8.c
	src/utf8.h
	src/ws.c
	src/ws.h
)

# Binaries
include_directories(${CMAKE_CURRENT_BINARY_DIR})
add_executable(cauldrond ${cauldrond_src})
target_link_libraries(cauldrond pthread)
