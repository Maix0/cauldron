/*
 * Copyright (C) 2016-2020 Davidson Francis <davidsondfgl@gmail.com>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>
 */

#include <assert.h>
#include <grp.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/types.h>
#include <unistd.h>
#include <errno.h>
#include "ws.h"
#include "config.h"

static FILE *logfile = NULL;

/**
 * @dir example/
 * @brief wsServer examples folder
 *
 * @file send_receive.c
 * @brief Simple send/receiver example.
 */

/**
 * @brief Called when a client connects to the server.
 *
 * @param fd File Descriptor belonging to the client. The @p fd parameter
 * is used in order to send messages and retrieve informations
 * about the client.
 */
void onopen(int fd)
{
	char *cli;
	cli = ws_getaddress(fd);
	assert(logfile != NULL);
	fprintf(logfile, "Connection opened from %s\n", cli);
	fflush(logfile);
	free(cli);
}

/**
 * @brief Called when a client disconnects to the server.
 *
 * @param fd File Descriptor belonging to the client. The @p fd parameter
 * is used in order to send messages and retrieve informations
 * about the client.
 */
void onclose(int fd)
{
	char *cli;
	cli = ws_getaddress(fd);
	assert(logfile != NULL);
	fprintf(logfile, "Connection closed from %s\n", cli);
	fflush(logfile);
	free(cli);
}

/**
 * @brief Called when a client connects to the server.
 *
 * @param fd File Descriptor belonging to the client. The
 * @p fd parameter is used in order to send messages and
 * retrieve informations about the client.
 *
 * @param msg Received message, this message can be a text
 * or binary message.
 *
 * @param size Message size (in bytes).
 *
 * @param type Message type.
 */
void onmessage(int fd, const unsigned char *msg, size_t size, int type)
{
	(void)size;
	(void)type;

	char *cli;
	cli = ws_getaddress(fd);
	assert(logfile != NULL);
	fprintf(logfile, "Message received from %s: %s\n", cli, msg);
	fflush(logfile);
	free(cli);
}

/**
 * @brief Main routine.
 *
 * @note After invoking @ref ws_socket, this routine never returns,
 * unless if invoked from a different thread.
 */
int main(int argc, char *argv[])
{
	pid_t pid;
	FILE *fp;
	unsigned short port = 2001;

	/* Handle parameters
	 */
	if (argc > 1) {
		if (strcmp(argv[1], "-v") == 0) {
			printf("Cauldron VTT websocket server v%s\n", VERSION);
			return EXIT_SUCCESS;
		} else {
			char *end = NULL;
			errno = 0;
			unsigned int value = strtoul(argv[1], &end, 10);
			if (errno != 0 || (end != NULL && *end != '\0') || value >= 0xFFFF)
				return EXIT_FAILURE;
			port = value;
		}
	}

	if ((getuid() == 0) || (geteuid() == 0)) {
		/* Create and open logfile
		 */
		if (strlen(LOGFILE) > 0) {
			if ((logfile = fopen(LOGFILE, "a")) == NULL) {
				perror("fopen(LOGFILE)");
				return EXIT_FAILURE;
			}

			if (chown(LOGFILE, UID, GID) == -1) {
				perror("chown(LOGFILE, UID, GID)");
			}
		}

		/* Fork
		 */
		switch (pid = fork()) {
			case -1:
				perror("fork()");
				return EXIT_FAILURE;
			case 0:
				if (setsid() == -1) {
					perror("setsid()");
					return EXIT_FAILURE;
				}
				break;
			default:
				if ((fp = fopen(PIDFILE, "w")) == NULL) {
					perror("fopen(PIDFILE)");
					return EXIT_FAILURE;
				}
				fprintf(fp, "%d\n", (int)pid);
				fclose(fp);
				return EXIT_SUCCESS;
		}

		/* Set user and groud id
		 */
		setgroups(0, NULL);
		if (setgid(GID)) return EXIT_FAILURE;
		if (setuid(UID)) return EXIT_FAILURE;
	}

	/* Start the websocket server
	 */
	struct ws_events evs;
	if (logfile != NULL) {
		evs.onopen    = &onopen;
		evs.onclose   = &onclose;
		evs.onmessage = &onmessage;
	} else {
		evs.onopen    = NULL;
		evs.onclose   = NULL;
		evs.onmessage = NULL;
	}
	ws_socket(&evs, port, 0);

	return EXIT_FAILURE;
}
